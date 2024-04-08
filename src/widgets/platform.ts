import { JupyterFrontEnd } from '@jupyterlab/application';
import { TabPanel } from '@lumino/widgets';

export enum PlatformType {
  JUPYTER_LAB,
  JUPYTER_NOTEBOOK7_TREE
}

export type Notebook7TreePanels = {
  tree: TabPanel;
};

export type Platform = {
  type: PlatformType;
  notebook7TreePanels?: Notebook7TreePanels;
};

function checkPlatform(
  app: JupyterFrontEnd,
  callback: (platform: Platform) => void
) {
  const widgets = Array.from(app.shell.widgets('main'));
  if (widgets.length === 0) {
    setTimeout(() => {
      checkPlatform(app, callback);
    }, 10);
    return;
  }
  const tab = widgets[0] as TabPanel;
  const type = !tab.addWidget
    ? PlatformType.JUPYTER_LAB
    : PlatformType.JUPYTER_NOTEBOOK7_TREE;
  const platform: Platform = {
    type
  };
  if (type === PlatformType.JUPYTER_NOTEBOOK7_TREE) {
    platform.notebook7TreePanels = {
      tree: tab
    };
  }
  callback(platform);
}

export function getPlatform(app: JupyterFrontEnd): Promise<Platform> {
  return new Promise<Platform>((resolve, reject) => {
    checkPlatform(app, platform => {
      resolve(platform);
    });
  });
}
