---
draft: false
date: 2024-10-08
categories:
  - zed
  - ollama
---
# Thoughts After Using Zed For A While

For those who haven't heard of [Zed](Zed.dev): Zed is a lightweight code editor that, from their homepage, "designed for high-performance collaboration with humans and AI". I originally heard about Zed via [ThePrimeagen's](https://www.youtube.com/@ThePrimeagen) interview with Thorsten Ball, who is a engineer working for and on Zed. [Link to the interview](https://www.youtube.com/watch?v=8XweSqTYdMQ). 

## What drew me to Zed
Some things that originally pulled me towards Zed was how ridiculously fast it is. I generally used to mainly use PyCharm for most if not all of my programming. PyCharm is very feature rich, but in all honesty how often do I use 99% of those features... almost never. Zed really gives me the most barebones experience (without having to switch to NeoVim) and lets me customize anything I could want. 

Another big reason I was drawn to Zed was because it's open source! I personally believe that if there's an open source version of software that you use, as long as it has all the features you need, there's really very little reason to not use it. 

Another key draw for me is Zed's strong connection to Vim motion commands. After experimenting with both PyCharm and
VSCode's Vim extensions, I found that PyCharm's native keyboard shortcuts clashed with Vim motions – a problem I've never
experienced with Zed. This made it an attractive choice for me.

Finally, the ability to easily switch between LLMs is probably my favorite feature in Zed. As someone who likes to stay
up-to-date on the latest LLM, having this flexibility has been invaluable – I can try out new models directly in Zed and see if they're worth switching to. Personally, I use [Ollama](https://ollama.com/) to easily download and run models locally.

## Parts of Zed I don't like
The main bone I have to pick with Zed is the lack of Pytest support. I use Pytest in most if not all of the project I contribute too. The good news is, is that it looks like there's a Github [issue](https://github.com/zed-industries/zed/issues/12080) and [pull request](https://github.com/zed-industries/zed/pull/18824) to add Pytest support! So this is a really small bone that will hopefully be taken care of soon. 

The only other issue I've had with Zed is being able to use a Docker container as the remote development environment. Sometimes I prefer to use Docker to manage different things around my projects and I typically like to use Docker when deploying apps in production. 

## Conclusion (Pros vs Cons)

After spending some time using Zed, I must say that it has been a
resounding success for me. Its lightweight design, customization options,
and connection to Vim motion commands have made it an ideal choice for my needs.

As a TLDR:
Pros:

* Ridiculously fast
* Open source
* Native Vim motions
* Easy LLM model customization

Cons:

* Lack of Pytest Support (though this is being worked on)
* Lack of Docker container support as the remote development environment