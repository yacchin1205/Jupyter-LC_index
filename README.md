# Jupyter-LC\_index [![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/NII-cloud-operation/Jupyter-LC_index/)

Jupyter-LC\_index is an extension that put README.svg and README.md on the tree page of Jupyter.

![example](./example/image.png)

If you have both of .md and .svg in the directory, the SVG appears on top of the page and Markdown appears on the bottom.

## Prerequisite

* Jupyter Notebook 4.2.x or 5.x or 6.x

## Installation

        $ pip install git+https://github.com/NII-cloud-operation/Jupyter-LC_index

To use the extension you will also need to install and enable, you can use Jupyter subcommand:

        $ jupyter nbextension install --py notebook_index
        $ jupyter nbextension enable --py notebook_index

then restart Jupyter notebook.
