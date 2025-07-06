---
draft: true
date: 2025-07-07
categories:
  - git
  - vcs
  - jujitsu
---
# I Tried Jujitsu And I Have Thoughts

First off, what even is [Jujitsu](https://jj-vcs.github.io/jj/latest/)? I'll keep this brief, but the basic explanation is Jujitsu (I'll just call it `jj` from here on out) is a VCS that is `git` compatible. The main thing that pulled me to trying it out is how simple it seemed to use. That gets me into the some of the pros and I'll end with some of my small nitpicks. 

## Pros
1. Setup was insanely easy. 
	- Since I'm using MacOS, it was basically as simple as `brew install jj`. 
2. Simple workflows are also insanely easy. 
	- I think (with the current state of `jj`) the best place to use it is on the solo side-project that doesn't need to worry about branches and PRs and merge commits. The quick and dirty project I think is the best place to use this. 
	- The ability to just `jj abandon` a change, for some reason, just makes way more sense in my brain. 
3. The cli is a joy to use and to look at.
	- Specifically calling out `jj log` and `jj op log`. The way it uses colors and shows the perfect amount of information about every change with absolutely no configuration is super nice. Specifically looking at `jj op log` is so much nicer than `git reflog`. Being able to see exactly what the command I ran was has been very helpful.

## Cons
1. The whole mindset shift from git branches to `jj` bookmarks is a hard hill to climb.
	- A big thing I've been struggling with this is how to handle merging branches into the `main` branch. From what I've found so far, the best way to do that in `jj` is to use `jj new feature_branch main` this would create a new change based off `main` and `feature_branch`. 
	- What I would really like here is a single command equivalent to `git merge new_feature` that handles creating the merge commit and setting the commit message. 
2. Bookmarks don't auto-update when running `jj commit`.
	-  This has really become a sticking point. The workflow for me in `git` would be just `git commit` and the `git push`, but in `jj` it has to be `jj commit`, `jj bookmark set feature_branch -r @-`, and then `jj git push`. 
	- Generally, I've found most workflows in `jj` reduce the number of commands I have to run to achieve what I want (`jj undo` for example is much simpler to remember than `git reset`), but when working with bookmarks it seems to be much harder. 
	- There is this [Github Discussion](https://github.com/jj-vcs/jj/discussions/5568), with an alias that kinda solves this issue, but it doesn't seem to act predictably when working on multiple bookmarks/branches. 
3. Most IDEs don't have tooling to work with `jj`.
	- This is more of a small complaint, and not something that it's really on `jj` to fix, but since `jj` is so young most IDEs (from what I can find there's just a VSCode extension) the `git` tooling in other IDEs don't seem to know how to handle `jj`. Generally I want to see the change id in my IDE instead of seeing the commit hash since most `jj` commands work with the change id.


## Conclusion

After working with `jj` a bit my main problems are how it handles bookmarks as compared to how `git` handles branches. Now, I'll be the first to admit that I could totally just be missing something or not really understanding how bookmarks are supposed to work. 

I'm going to try and keep using `jj` as much as I can. The good thing is I can use it while also using `git` so if something doesn't work I can just switch back and get what I need done. 

Please feel free to send me any and all suggestions about what I'm doing wrong or if there's something I'm just missing!