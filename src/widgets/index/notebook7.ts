import { IDocumentManager } from '@jupyterlab/docmanager';
import { PlatformType, Notebook7TreePanels } from '../platform';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { LabIcon } from '@jupyterlab/ui-components';
import { Panel } from '@lumino/widgets';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { faPager } from '@fortawesome/free-solid-svg-icons';

import {
  BaseOpener,
  IContentOpener,
  LinkedWidget,
  LinkFor,
  RemoveCallback
} from './base';
import { extractSvgString } from './util';
import { LabelWidget } from './label';

export class JupyterNotebook7Opener
  extends BaseOpener
  implements IContentOpener
{
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

  protected async addWidget(
    linkedWidgets: LinkedWidget[]
  ): Promise<RemoveCallback> {
    const mainPanel = await this.createMainPanel(linkedWidgets);
    const tabsIndex = this.panels.tab.widgets.length;
    this.panels.tab.addWidget(mainPanel.panel);
    const leftPanel = await this.createLeftPanel(
      linkedWidgets,
      (index: number) => {
        const scroll = () => {
          const mainWidgets = mainPanel.widgets;
          if (!mainWidgets || !mainWidgets[index]) {
            return;
          }
          mainWidgets[index].node.scrollIntoView({ behavior: 'smooth' });
        };
        if (this.panels.tab.currentIndex === tabsIndex) {
          scroll();
          return;
        }
        this.panels.tab.currentIndex = tabsIndex;
        setTimeout(scroll, 100);
      }
    );
    this.panels.shell.add(leftPanel, 'left');

    this.panels.shell.activateById(leftPanel.id);
    return () => {
      leftPanel.dispose();
    };
  }

  private async createLeftPanel(
    linkedWidgets: LinkedWidget[],
    onClick: (index: number) => void
  ) {
    const panel = new Panel();
    panel.id = 'lc_index:index-left-widget';
    panel.addClass('lc-index-widget');
    const widgetInstances = await Promise.all(
      linkedWidgets.map(async ({ widget }) => await widget())
    );
    linkedWidgets.forEach(({ filename }, index) => {
      panel.addWidget(
        new LabelWidget(filename, () => {
          onClick(index);
        })
      );
      const widgetPanel = new Panel();
      widgetPanel.title.caption = filename;
      widgetPanel.title.closable = false;
      widgetPanel.title.label = filename;
      widgetPanel.addWidget(widgetInstances[index]);
      panel.addWidget(widgetPanel);
    });
    panel.title.caption = 'Index';
    panel.title.icon = new LabIcon({
      name: 'lc_index::lc_index',
      svgstr: extractSvgString(PlatformType.JUPYTER_NOTEBOOK7_TREE, faPager)
    });
    return panel;
  }

  private async createMainPanel(linkedWidgets: LinkedWidget[]) {
    const panel = new Panel();
    panel.id = 'lc_index:index-main-widget';
    panel.addClass('lc-index-widget');
    const widgetInstances = await Promise.all(
      linkedWidgets.map(async ({ widget }) => await widget())
    );
    const headers: LabelWidget[] = [];
    linkedWidgets.forEach(({ filename }, index) => {
      const label = new LabelWidget(filename);
      headers.push(label);
      panel.addWidget(label);
      panel.addWidget(widgetInstances[index]);
    });
    panel.title.caption = 'Index';
    panel.title.label = 'Index';
    panel.title.icon = new LabIcon({
      name: 'lc_index::lc_index',
      svgstr: extractSvgString(PlatformType.JUPYTER_NOTEBOOK7_TREE, faPager)
    });
    return {
      panel,
      widgets: headers
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
