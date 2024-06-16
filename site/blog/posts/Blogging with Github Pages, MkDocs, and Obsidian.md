---
draft: false
date: 2024-05-15
categories:
  - blogging
  - obsidian
  - mkdocs
---
# Blogging with Github Pages, MkDocs, and Obsidian
I feel like a lot of tech people have tried blogging. Personally, I've tried a couple times now across multiple different services (Substack, Medium, etc.) and nothing has really stuck for longer than a couple weeks. For me the main problem was it took a lot of effort to open the site and deal with their, not quite markdown, document editor. 

After finding and falling in love with [Obsidian](https://obsidian.md/)for keeping track of personal notes and thoughts, I figured it would be fairly simple to also use it for blogging with just a simple Github action and using [MkDocs](https://www.mkdocs.org/).

I figured this would be a good first blog post since it's something other's could benefit from and it was all still fresh in my mind! 

<!-- more -->

# Setting up the Github Repository
This is pretty trivial, on Github there are a couple "special" repositories you can make. One of them being `{github_username}.github.io`. When you create a repository with that name it's associated Github page will be just at that url. This differs from other repositories, where their Github pages get put at `{github_username}.github.io/{repository_name}`. 

Once you have the repository created we can start setting up Obsidian. 

# Setting up Obsidian
The easiest way to use Obsidian with Git is to just have your vault be the Git repository. There are ways you can make a subdirectory in a vault it's own Git repo (either via Git submodules or just putting the Git repo in the subdirectory), but that can make things way more complicated so I can cover that in a separate post if there's interest. 

To setup Obsidian Git I recommend following their [Getting Started](https://publish.obsidian.md/git-doc/Getting+Started) instruction page. Since we already created the repository on Github, you'll want to follow the [Starting with existing remote repository](https://publish.obsidian.md/git-doc/Getting+Started#Start+with+existing+remote+repository) instructions. 

Once you get the Git repository cloned and Obsidian Git setup there's one setting I'd like to draw your attention to. 

Vault Back Interval - this can be helpful to automatically push changes at a given interval. Be warned though, if you don't set the `draft` property on blog posts they will automatically be public when they're pushed. 

Once you get that setup it's time to start setting up MkDocs!

# Setting up MkDocs
First you're going to want to make sure to [install MkDocs](https://www.mkdocs.org/user-guide/installation/). I'd recommend creating a virtual python environment so it doesn't get install globally on your system. 

MkDocs uses the `mkdocs.yml` configuration file in the root of the repository.

```yml
site_description: Thomas Lazarus's Blog
site_name: Thomas Lazarus's Blog
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

Initially I had named the `site` directory `blog` but that would make the path to posts `blog/blog/posts` 🤮. The general directory structure is decided by the built-in blog plugin inside of [MkDocs material](https://squidfunk.github.io/mkdocs-material/plugins/blog/).

At this point you should be able to run `mkdocs serve` locally to see what your blog site will look like when deployed. Try putting a markdown file in the `/posts/` directory and see if it shows up! 

# Setting up the Github Action
Now that we have Obsidian automatically pushing changes and MkDocs configured the way we want. It's time to automatically publish the site. This is pretty simple via a Github action. 

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

# Conclusion
Now it's time to get blogging! One thing I really like about this setup is that it takes very little thought to create a post and publish it. It's as easy as opening Obsidian, typing some thoughts in markdown, and having Obsidian Git automatically (or manually) push the changes to Github. 


Thanks for reading! I'm planning on blogging (or probably more micro-blogging) new things I learn and tips and tricks I find. [Shoutout Simon Willison](https://x.com/simonw/) for inspiring me to do this with his [webblog](https://simonwillison.net/)