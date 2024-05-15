import { IDocumentManager } from '@jupyterlab/docmanager';
import { Platform, PlatformType, Notebook7TreePanels } from './platform';
import { IRenderMimeRegistry, MimeModel } from '@jupyterlab/rendermime';
import { LabIcon } from '@jupyterlab/ui-components';
import { Widget, Panel } from '@lumino/widgets';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

import { faPager } from '@fortawesome/free-solid-svg-icons';

export type RemoveCallback = () => void;

type Icon = {
  icon: any[];
};

function extractSvgString(platformType: PlatformType, icon: Icon): string {
  const path = icon.icon[4];
  const scale = platformType === PlatformType.JUPYTER_LAB ? '0.025' : '0.03';
  return `<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16">
    <g class="jp-icon3" fill="#616161">
      <path transform="scale(${scale}, ${scale}) translate(0, 0)" d="${path}" />
    </g>
  </svg>`;
}

export interface IContentOpener {
  open(
    svgPath: string | undefined,
    markdownPath: string | undefined
  ): Promise<RemoveCallback>;
}

enum LinkFor {
  IMAGE,
  LINK
}

abstract class BaseOpener implements IContentOpener {
  protected documents: IDocumentManager;
  protected renderMimeRegistry: IRenderMimeRegistry;

  constructor(
    documents: IDocumentManager,
    renderMimeRegistry: IRenderMimeRegistry
  ) {
    this.documents = documents;
    this.renderMimeRegistry = renderMimeRegistry;
  }

  async open(
    svgPath: string | undefined,
    markdownPath: string | undefined
  ): Promise<RemoveCallback> {
    const panel = new Panel();
    if (svgPath) {
      const svgModel = await this.documents.services.contents.get(svgPath);
      const svgMimeType = 'image/svg+xml';
      const svgRenderer = this.renderMimeRegistry.createRenderer(svgMimeType);
      const svgMimeModel = new MimeModel({
        data: { [svgMimeType]: svgModel.content },
        trusted: true
      });
      await svgRenderer.renderModel(svgMimeModel);
      panel.addWidget(svgRenderer);
    }
    if (markdownPath) {
      const markdownModel =
        await this.documents.services.contents.get(markdownPath);
      const markdownMimeType = 'text/markdown';
      const markdownRenderer =
        this.renderMimeRegistry.createRenderer(markdownMimeType);
      const markdownMimeModel = new MimeModel({
        data: { [markdownMimeType]: markdownModel.content },
        trusted: false
      });
      await markdownRenderer.renderModel(markdownMimeModel);
      panel.addWidget(markdownRenderer);
      this.modifySource(markdownRenderer, markdownPath);
    }
    panel.addClass('lc-index-widget');
    panel.id = 'lc_index:index-widget';
    panel.title.label = 'Index';
    panel.title.closable = true;
    return this.addWidget(panel);
  }

  protected abstract resolveRelativePathOrHandler(
    linkFor: LinkFor,
    path: string
  ): string | (() => boolean);

  protected resolveRelativePath(path: string, basePath: string): string {
    const parentBasePath = basePath.replace(/[^/]+$/, '');
    return parentBasePath + path;
  }

  private isRelativePath(path: string): boolean {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return false;
    }
    if (path.startsWith('/')) {
      return false;
    }
    return true;
  }

  private modifySource(widget: Widget, basePath: string) {
    widget.node.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (!src) {
        return;
      }
      if (!this.isRelativePath(src)) {
        return;
      }
      const url = this.resolveRelativePathOrHandler(
        LinkFor.IMAGE,
        this.resolveRelativePath(src, basePath)
      );
      if (typeof url === 'function') {
        throw new Error('Not supported');
      }
      img.setAttribute('src', url);
    });
    widget.node.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) {
        return;
      }
      if (!this.isRelativePath(href)) {
        return;
      }
      const urlOrHandler = this.resolveRelativePathOrHandler(
        LinkFor.LINK,
        this.resolveRelativePath(href, basePath)
      );
      if (typeof urlOrHandler === 'function') {
        a.setAttribute('href', '#');
        a.onclick = urlOrHandler;
        return;
      } else {
        a.setAttribute('href', urlOrHandler);
      }
    });
  }

  protected abstract addWidget(widget: Widget): RemoveCallback;
}

class JupyterLabOpener extends BaseOpener implements IContentOpener {
  private app: JupyterFrontEnd;

  constructor(
    app: JupyterFrontEnd,
    documents: IDocumentManager,
    renderMimeRegistry: IRenderMimeRegistry
  ) {
    super(documents, renderMimeRegistry);
    this.app = app;
  }

  protected addWidget(widget: Widget): RemoveCallback {
    widget.title.icon = new LabIcon({
      name: 'lc_index::lc_index',
      svgstr: extractSvgString(PlatformType.JUPYTER_LAB, faPager)
    });
    this.app.shell.add(widget, 'main');
    return () => {
      widget.dispose();
    };
  }

  protected resolveRelativePathOrHandler(
    linkFor: LinkFor,
    path: string
  ): string | (() => boolean) {
    if (linkFor === LinkFor.IMAGE) {
      return '/files/' + path;
    }
    return () => {
      this.documents.openOrReveal(decodeURI(path));
      return false;
    };
  }
}

class JupyterNotebook7Opener extends BaseOpener implements IContentOpener {
  private panels: Notebook7TreePanels;
  private settings: ServerConnection.ISettings;

  constructor(
    documents: IDocumentManager,
    renderMimeRegistry: IRenderMimeRegistry,
    panels: Notebook7TreePanels
  ) {
    super(documents, renderMimeRegistry);
    this.panels = panels;
    this.settings = ServerConnection.makeSettings();
  }

  protected addWidget(widget: Widget): RemoveCallback {
    widget.title.icon = new LabIcon({
      name: 'lc_index::lc_index',
      svgstr: extractSvgString(PlatformType.JUPYTER_NOTEBOOK7_TREE, faPager)
    });
    this.panels.tree.insertWidget(0, widget);
    this.panels.tree.currentIndex = 0;
    return () => {
      widget.dispose();
    };
  }

  protected resolveRelativePathOrHandler(
    linkFor: LinkFor,
    subPath: string
  ): string {
    const { baseUrl } = this.settings;
    if (linkFor === LinkFor.IMAGE) {
      return URLExt.join(baseUrl, 'files', subPath);
    }
    if (subPath.match(/\.ipynb$/i)) {
      return URLExt.join(baseUrl, 'notebooks', subPath);
    }
    return URLExt.join(baseUrl, 'edit', subPath);
  }
}

export function createOpener(
  app: JupyterFrontEnd,
  platform: Platform,
  documents: IDocumentManager,
  renderMimeRegistry: IRenderMimeRegistry
): IContentOpener {
  if (platform.type === PlatformType.JUPYTER_LAB) {
    return new JupyterLabOpener(app, documents, renderMimeRegistry);
  }
  if (platform.type === PlatformType.JUPYTER_NOTEBOOK7_TREE) {
    if (!platform.notebook7TreePanels) {
      throw new Error('Jupyter Notebook7 Tree Panels are not available');
    }
    return new JupyterNotebook7Opener(
      documents,
      renderMimeRegistry,
      platform.notebook7TreePanels
    );
  }
  throw new Error('Unknown platform: ' + platform.type);
}
