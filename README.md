<h1 align="center">Extended Graph</h1>

<p align="center">Enhance the core graph plugin of <a href="https://obsidian.md/">Obsidian</a> with new features.</p>

This plugin enables you to:
- Add images to graph nodes.
- Easily filter by tags and properties.
- Remove links based on relationship types.
- Configure multiple views and switch between them seamlessly.

> [!IMPORTANT]
> This project is a work in progress. Before testing the plugin, please refer to the ![](#supporting) to review potential bugs and risks..

![](doc/images/overview.webp)

## Installation

The plugin is available in beta through BRAT:
1. Install and enable the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) in your vault.
2. Navigate to `Settings > BRAT > Beta Plugin List > Add Beta Plugin`.
3. Enter `https://github.com/ElsaTam/obsidian-extended-graph` into the input field and select `Add Plugin`.


## Getting started

### Configure Features

Access the plugin settings to select the features you want to use:
- `Tags`: Use tags found in notes to filter graph nodes.
- `Properties`: Filter nodes based on selected properties. Inline properties (`[type:: plugin]`) are supported if you use Dataview.
- `Links`: Assign link types using properties. Inline properties (`[subject:: [[graph]]]`) are supported if you use Dataview.

For each filter, you can define:
- Ignored types.
- Type colors.

You can also enable the following features:
- `Images`: Add images to nodes if a property (e.g., `image`) in the frontmatter contains a link to an image. You can customize the property key.
- `Focus active nove`: Scale the node associated with the currently active markdown file.


### Toggle plugin

Open the graph view. By default, the plugin is disabled for new graphs to prevent performance issues. To activate it:
1. Click the <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg> button in the graph view.
2. If the graph contains too many nodes, the plugin will not enable itself. Adjust the node limit in settings (default: 20). I have tried with up to 500 nodes and it takes a little time to load everything but then it works just fine on my computer.

### Filter your graph

Display the legend by clicking the <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tag"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg> icon. From there, you can toggle various links, tags, and properties according to your configured settings.

![](doc/images/interactives.webp)

### Save your view

Adjust the graph settings and filters using the interactive legend. Once you've configured a state you want to preserve, open the view panel (<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg> icon) and save it as a new view by clicking the `+ Add View` button. Enter a name, confirm, and your current state will be saved as a view you can quickly revisit anytime.

⚠️ Switching to a new view without saving changes will discard any unsaved settings.

The default view always contains all nodes and links and cannot be deleted.

![](doc/images/views.webp)

While the plugin is active in a graph, any changes made to the core plugin settings will not be saved. To preserve these settings for use when the plugin is disabled, expand the `Extended Graph` section in the graph controls panel and click `Save for normal view` <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-to-line"><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></svg>

Conversely, when the plugin is disabled, views cannot be modified. Upon re-enabling the plugin, the settings will automatically revert to those of the 'Default View'. To copy your current settings to the default view, click `Save for default view` <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-to-line"><path d="M5 3h14"/><path d="m18 13-6-6-6 6"/><path d="M12 7v14"/></svg>

### Additional features

#### Global Filter

Set up a global filter to apply across all graphs where the plugin is enabled. This allows you to exclude specific files or folders from the graph without needing to add them to the exclusion list.

### Fade out nodes

Instead of removing nodes when tags or properties are no longer enabled, you can choose to fade them out. Faded nodes remain in the graph and contribute to force calculations but are visually deemphasized.

## Demo

![](doc/images/quick-demo-gif.gif)

## Supporting

I am currently seeking beta testers willing to try the plugin and report issues. Since the core graph plugin lacks an API and documentation, many features are experimental, and feedback is critical to identify and resolve bugs.

**Expected risks**:
- **Graph Settings Loss**: If the app does not close properly, graph settings could be lost. To avoid this, save your current settings for the default view so they can be restored if needed.

**Expected bugs**:
- **Global Filter Conflicts**: Disabling the plugin may transfer the Global Filter to the regular search filter. If nodes disappear unexpectedly when the plugin is disabled, check the search filter.
- **Show Orphans Sync Issue**: The plugin does not sync with the Show Orphans option. Disabling this option while the plugin is active may cause issues if some orphans are created by filtered-out links.
- **Asynchronous Errors**: Rapid interactions (e.g., toggling features, switching views, modifying filters) can result in data inconsistencies due to asynchronous processing. Resetting the plugin usually resolves the issue. If not, close and reopen the tab.

The plugin is completely free to test and will always stay that way, and open source. If you'd like to support its development, you can make a donation via this link: https://github.com/sponsors/ElsaTam


## License

GNU General Public License version 3 (GPLv3) License