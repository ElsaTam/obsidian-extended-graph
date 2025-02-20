export default class STRINGS {
	static plugin = {
		default: "Default",
		folder: "Folder",
		nodeName: "Node Name",
		info: "Info",
		name: "Extended Graph",
		nodes: "Nodes",
		options: "Options",
		source: "Source",
		target: "Target",
		valuePlaceholder: "value...",
	};

	static controls = {
		add: "Add",
		apply: "Apply",
		cancel: "Cancel",
		delete: "Delete",
		disable: "Disable",
		disableAll: "Disable all",
		enable: "Enable",
		enabled: "Enabled",
		enableAll: "Enable all",
		openLegend: "Open legend (tags, links, properties)",
		moveUp: "Move up",
		moveDown: "Move down",
		page: "Page",
		pageCurrent: "Current page",
		pageFirst: "First page",
		pageLast: "Last page",
		resetGraph: "Reset graph",
		save: "Save",
		show: "Show",
		rows: "rows"
	};

	static errors = {
		uri401: "Unauthorized URL (Code 401) while trying to get an image for a node. This probably means that the URL is invalid. No image will be loaded and this message can safely be ignored.",
		issueNeedView: "There was an issue with the plugin " + STRINGS.plugin.name + ". Please close the graph view and open it again.",
	}

	static features = {
		autoEnable: "Auto enable",
		autoEnableDesc: "Auto enable the plugin in graph views",
		borderUnresolved: "Border of unresolved nodes",
		borderUnresolvedDesc: "If greater than 0, unresolved nodes will only show an outside circle border instead of a full disk",
		disableNodes: "Disable nodes",
		disableNodesDesc: "When all arcs are disabled on the node, remove it from the graph",
		familyTree: {
			noUpKey: "No property for the up key is enabled in this graph",
			noDownKey: "No property for the down key is enabled in this graph",
			impossibleToBuild: "Impossible to create a family tree view.",
		},
		focus: "Focus",
		focusDesc: "Scale up the node corresponding to the active note",
		focusScale: "Scale factor",
		focusScaleDesc: "The node corresponding to the currently active note will be scaled up by this factor",
		folders: "Folders",
		foldersDesc: "Display folder boxes",
		globalFilter: "Global filter",
		globalFilterDesc: "This filter query will be prepend at the beginning of every graph filter",
		image: "Image",
		imageDesc: "Display image on top of nodes",
		imagesAllowExternal: "Allow images from the web",
		imagesAllowExternalDesc: "Allow the loading of external images via http: and https: protocols",
		imagesAllowExternalLocal: "Allow local images outside of the vault",
		imagesAllowExternalLocalDesc: "Allow the loading of external images via file: and app: protocols",
		imagesFromProperty: "From a property",
		imagesFromPropertyDesc: "Display image from a property in the frontmatter",
		imagesFromEmbeds: "From embeds",
		imagesFromEmbedsDesc: "Display an image if one is found among the embeds in the note. The image from a property is taken first when possible.",
		imagesForAttachments: "For attachments",
		imagesForAttachmentsDesc: "Display image for attachment nodes",
		imageProperty: "Image property",
		imagePropertyDesc: "Name of the propery used to query the image of the node's note",
		imageBorderWidth: "Border width (%)",
		imageBorderWidthDesc: "Percentage of the node's background that will stay visible as a border",
		interactives: {
			arcsAdd: "Add arcs",
			arcsAddPropertyDesc: "Add arcs around the nodes to visualize the property values",
			arcsAddTagDesc: "Add arcs around the nodes to visualize the tags",
			colorLinks: "Color links",
			colorLinksDesc: "Add colors to the link rendered in the graph view",
			curvedLinks: "Curved links",
			curvedLinksDesc: "Use curved links instead of straight lines",
			links: "Links",
			linksDesc: "Display and filter link types",
			noneTypeID: "None type id",
			noneTypeIDDesc: "The id which will be given if nothing is found for ",
			palette: "Color palette",
			paletteDesc: "Choose the color palette for ",
			paletteMatplotlibDesc: "These colormaps come from matplotlib. You can see more about them here: ",
			palettePickGradient: "Pick palette gradient",
			properties: "Properties",
			propertiesDesc: "Display and filter by property values",
			property: "Property",
			propertyDesc: "Display and filter property ",
			propertyAlreadyExists: "This property already exists",
			propertyReservedFolders: "This property key is reserved for folders",
			propertyReservedLinks: "This property key is reserved for links",
			propertyReservedTags: "This property key is reserved for tags",
			selection: "Selection",
			selectionDesc: "Choose which values should be considered by the plugin",
			selectionFor: "Selection for",
			specificColors: "Specific colors",
			specificColorsDesc: "Choose specific colors to override the color palette",
			tags: "Tags",
			tagsDesc: "Display and filter by tags",
		},
		linksFeatureRequired: "The Links feature needs to be enabled.",
		pinnedNodes: "Pinned nodes",
		pinNode: "Pin node",
		unpinNode: "Unpin node",
		unpinAllNodes: "Unpin all nodes",
		pinMultipleNodes: "Pin multiple nodes",
		pinMultipleShape: "Shape",
		pinMultipleGap: "Gap between nodes",
		pinMultipleCenter: "Center",
		pinMultipleGridSize: "Number of columns",
		pinMultipleGridSizeDesc: "Values can be 'N' (single row), 'auto' (square grid) or a positive number",
		size: "Size",
		elementsStats: "Nodes and links statistics",
		elementsStatsDesc: "Choose how nodes and links sizes/colors must be computed",
		linkSizesFunction: "Link size function",
		linkSizesFunctionDesc: "Select how the graph engine should compute the thickness of the links",
		linkColorsFunction: "Link color function",
		linkColorsFunctionDesc: "Select how the graph engine should compute the color of the links",
		linkColorsPaletteDesc: "Choose the color palette for the links",
		nodeSizesFunction: "Node size function",
		nodeSizesFunctionDesc: "Select how the graph engine should compute the size of the nodes",
		nodeSizesProperty: "Node size property",
		nodeSizesPropertyDesc: "Name of the property used to specify the size of the node. It must be of type number. A value of 100 is the default. Leave empty if you don't need a per-node granularity.",
		nodeColorsFunction: "Node color function",
		nodeColorsFunctionDesc: "Select how the graph engine should compute the color of the nodes",
		nodeColorsPaletteDesc: "Choose the color palette for the nodes",
		performance: "Performances",
		performanceDelay: "Initialization delay (milliseconds)",
		performanceDelayDesc: "Because of asynchronous mechanics, it can be needed to wait a time before starting initializing the extended features",
		performanceMaxNodes: "Maximum number of nodes",
		performanceMaxNodesDesc: "If the graph contains more nodes than this setting, the plugin will be disabled",
		removeSources: "Remove sources",
		removeSourcesDesc: "When disabling a link type, also disable the source nodes",
		removeTargets: "Remove targets",
		removeTargetsDesc: "When disabling a link type, also disable the source nodes",
		shape: "Shape",
		shapes: "Shapes",
		shapesDesc: "Use nodes of various shapes",
		shapePick: "Pick shape",
		shapesNames: {
			circle: "circle",
			square: "square",
			triangle: "triangle",
			diamond: "diamond",
			pentagon: "pentagon",
			hexagon: "hexagon",
			octagon: "octagon",
			decagon: "decagon",
			star4: "star (4)",
			star5: "star (5)",
			star6: "star (6)",
			star8: "star (8)",
			star10: "star (10)",
			polygon: "polygon",
			starburst: "starburst",
			grid: "grid",
			line: "line",
			unknown: "unknown"
		},
		svgScreenshotArcs: "Show arcs (tags and/or types)",
		svgScreenshotCopy: "Copy SVG screenshot",
		svgScreenshotCopyCode: "Copy SVG code to clipboard",
		svgScreenshotCopyImage: "Copy SVG image to clipboard",
		svgScreenshotCurvedLinks: "Use curved links",
		svgScreenshotNodeNames: "Show node names",
		svgScreenshotNodeShapes: "Use nodes shapes",
		svgScreenshotOptions: "SVG Screenshot options",
		svgScreenshotVisibleArea: "Export only visible area",
		zoomOnNode: "Zoom on node",
		zoomScale: "Zoom scale",
		zoomScaleDesc: "When zooming on a note, set the used scale",
	};

	static notices = {
		disabled: "disabled",
		graphAnalysisPluginRequired: "Graph Analysis plugin must be enabled to use this function",
		invalidCharacter: "Invalid character",
		nlpPluginRequired: "NLP plugin must be enabled to use this function",
		nodeLimiteExceeded: "Try to handle too many nodes",
		nodeLimiteIs: "The limite is",
		stateDeleted: "State has been removed",
		stateSaved: "State has been saved",
		svgCopied: "SVG copied to clipboard",
	}

	static query = {
		AND: "AND",
		OR: "OR",
		combinationLogic: "Combination logic",
		editShapeQuery: "Edit shape query",
		setShapeQueryFor: "Set shape query for",
		files: "Files",
		logicKey: {
			contains: "contains",
			containsNot: "doesn't contain",
			is: "is",
			isNot: "is not",
			containsRegex: "contains regex",
			containsRegexNot: "doesn't contain regex",
			matchesRegex: "matches regex",
			matchesRegexNot: "doesn't match regex",
			isEmpty: "is empty",
			isEmptyNot: "is not empty",
		},
		matchingFiles: "Matching files",
		query: "Query",
		rules: "Rules",
		source: {
			all: "All",
			tag: "Tags",
			link: "Links",
			property: "Property",
			file: "File",
			folder: "Folder",
			folderRec: "Folder and subfolders",
			path: "Path"
		},
		viewMatches: "View matches",
	};

    static states = {
		graphState: "Graph state",
		newStateName: "New state name",
		openSettings: "Open state settings",
        saveForDefaultState: "Save for default state",
        saveForDefaultStateDesc: "Save the current settings as the default state settings",
        saveForNormalState: "Save for normal state",
        saveForNormalStateDesc: "Save the current settings as the normal state settings (no plugin enabled)",
		showGraphState: "Show graph state",
		startingState: "Starting state",
		startingStateDesc: "Select which state should be used to initiate the plugin",
		states: "States",
    };

	static statsFunctions = {
		AdamicAdar: "Adamic Adar",
		authority: "Authority centrality (from HITS)",
		backlinksCount: "Number of backlinks",
		betweenness: "Betweenness centrality",
		BoW: "Bag of Words",
		closeness: "Closeness centrality",
		clusteringCoefficient: "Clustering coefficient",
		coCitations: "Co-Citations",
		creationTime: "Time since file creation",
		degree: "Degree centrality",
		eccentricity: "Eccentricity in the connected graph",
		eigenvector: "Eigenvector centrality",
		filenameLength: "File name length",
		forwardlinksCount: "Number of forward links",
		forwardUniquelinksCount: "Number of unique forward links",
		hub: "Hub centrality (from HITS)",
		Jaccard: "Jaccard Similarity",
		modifiedTime: "Time since last modification",
		OtsukaOchiai: "Otsuka-Ochiai Coefficient",
		overlap: "Overlap Coefficient",
		tagsCount: "Number of tags",
		warningUnreliableOS: "This calculation is unreliable and might vary between OS.",
		sentiment: "Sentiment",
	};

	static {
		STRINGS.localize();
	}

	/**
	 * Dynamically import strings for the current language.
	 */
	private static async localize(): Promise<void> {
		let localizedStrings: any;
		switch (window.localStorage.language) {
			case 'fr': localizedStrings = await import('i18n/fr.json'); break;
			default: return;
		}
		this.localizeDefaultStrings(this, localizedStrings);
	}

	/**
	 * Replace default strings with localized strings.
	 * Strings and their keys are always type-safe, even if the localized JSON is incomplete or broken.
	 */
	private static localizeDefaultStrings(defaultStrings: any, localizedStrings: any): void {
		for (const [key, value] of Object.entries(localizedStrings)) {
			if (typeof defaultStrings[key] === 'object') {
				if (typeof value === 'object') {
					this.localizeDefaultStrings(defaultStrings[key], value);
				}
			} else if (typeof value === 'string') {
				defaultStrings[key] = value;
			}
		}
	}
}