---
draft: true
date: 2024-05-12
categories:
  - blogging
  - obsidian
  - mkdocs
---

# Setting up MkDocs
MkDocs uses the `mkdocs.yml` configuration file in the root of the repository.

```yml
site_description: Personal tech blog
site_name: Thomas Lazarus
site_url: http://lazarust.github.io

docs_dir: ./site/blog
site_dir: page

theme:
  name: material
  palette:
    - media: "(prefers-color-scheme: light)"
      scheme: default
      toggle:
        icon: material/toggle-switch-off-outline
        name: Switch to dark mode
    - media: "(prefers-color-scheme: dark)"
      scheme: slate
      toggle:
        icon: material/toggle-switch
        name: Switch to light mode

plugins:
  - search
  - blog:
      blog_dir: .
  - rss:
      match_path: blog/posts/.*
      date_from_meta:
        as_creation: date
      categories:
        - categories
        - tags
      enabled: true
```

As you can see there is quite a lot of references to directories in the configuration so I'll take this space to explain how I have things organized. 

```
. 
├── site/ 
│ └── blog/ 
│     └── posts/ 
│         └── Blogging with Github Pages, MkDocs, and Obsidian.md #(This current blog post) 
└── mkdocs.yml
```

Initially I had 

# The Github Action

```yml
name: build_site
on:
  push:
    branches:
      - main
permissions:
  contents: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: 3.x
      - uses: actions/cache@v2
        with:
          key: ${{ github.ref }}
          path: .cache
      - run: pip install mkdocs-material mkdocstrings-python mkdocs-rss-plugin
      - run: mkdocs gh-deploy --force
```

The Github action to automatically deploy blog posts is pretty simple and really has 2 main steps after using the `checkout` and `setup-ptyhon` workflows. 
1. `pip install mkdocs-material mkdocstrings-python mkdocs-rss-plugin`
	- This just installs the necessary `mkdocs` plugins. If you aren't using the [Material Theme](https://squidfunk.github.io/mkdocs-material/) or the [RSS Plugin](https://guts.github.io/mkdocs-rss-plugin/) you don't need to install them (though I highly recommend using them since they can greatly improve the experience of reading your blog).
2. `mkdocs gh-deploy --force`
	- This pushes the generated html files onto the `gh-pages` branch. 
	- I prefer to use `--force` so it overwrites any previous releases.