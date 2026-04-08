<script lang="ts">
	import { onMount, onDestroy, setContext, untrack } from 'svelte';
	import MapLibreGL from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { browser } from '$app/environment';

	function getDocumentTheme(): 'light' | 'dark' | null {
		if (typeof document === 'undefined') return null;
		if (document.documentElement.classList.contains('dark')) return 'dark';
		if (document.documentElement.classList.contains('light')) return 'light';
		return null;
	}

	function getSystemTheme(): 'light' | 'dark' {
		if (typeof window === 'undefined') return 'light';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	let tailwindTheme: 'light' | 'dark' = $state('light');

	type MapStyleOption = string | MapLibreGL.StyleSpecification;

	export type MapViewport = {
		center: [number, number];
		zoom: number;
		bearing: number;
		pitch: number;
	};

	interface Props {
		children?: import('svelte').Snippet;
		styles?: { light?: MapStyleOption; dark?: MapStyleOption };
		theme?: 'light' | 'dark';
		projection?: MapLibreGL.ProjectionSpecification;
		center?: [number, number];
		zoom?: number;
		padding?: Partial<{ top: number; bottom: number; left: number; right: number }>;
		options?: Omit<MapLibreGL.MapOptions, 'container' | 'style'>;
		viewport?: Partial<MapViewport>;
		onviewportchange?: (viewport: MapViewport) => void;
	}

	const defaultStyles = {
		dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
		light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
	};

	const defaultPadding = { top: 50, bottom: 50, left: 50, right: 50 } as const;

	let {
		children,
		styles,
		theme: explicitTheme,
		projection,
		center = [27.573931345120904, 47.17512407569707],
		zoom = 0,
		padding: paddingProp,
		options = {},
		viewport,
		onviewportchange
	}: Props = $props();

	const padding = $derived({
		top: paddingProp?.top ?? defaultPadding.top,
		bottom: paddingProp?.bottom ?? defaultPadding.bottom,
		left: paddingProp?.left ?? defaultPadding.left,
		right: paddingProp?.right ?? defaultPadding.right
	});

	let mapContainer: HTMLDivElement;
	let map: MapLibreGL.Map | null = $state(null);
	let isMounted = $state(false);
	let isLoaded = $state(false);
	let isStyleLoaded = $state(false);
	let isInteracting = $state(false);
	let hasInitiallyLoaded = $state(false);
	let initialStyleApplied = false;
	let initialCenterZoomApplied = false;
	let styleTimeoutId: ReturnType<typeof setTimeout> | null = null;
	let internalUpdate = false;

	const isControlled = $derived(viewport !== undefined && onviewportchange !== undefined);

	function getViewport(mapInstance: MapLibreGL.Map): MapViewport {
		const c = mapInstance.getCenter();
		return {
			center: [c.lng, c.lat],
			zoom: mapInstance.getZoom(),
			bearing: mapInstance.getBearing(),
			pitch: mapInstance.getPitch()
		};
	}

	const mapStyles = $derived({
		dark: styles?.dark ?? defaultStyles.dark,
		light: styles?.light ?? defaultStyles.light
	});

	const resolvedTheme = $derived(tailwindTheme);

	const currentStyle = $derived(resolvedTheme === 'light' ? mapStyles.light : mapStyles.dark);

	const isReady = $derived(isMounted && isLoaded && isStyleLoaded);

	setContext('map', {
		getMap: () => map,
		isLoaded: () => hasInitiallyLoaded,
		isStyleReady: () => isReady
	});

	function clearStyleTimeout() {
		if (styleTimeoutId) {
			clearTimeout(styleTimeoutId);
			styleTimeoutId = null;
		}
	}

	onMount(() => {
		isMounted = true;

		if (browser) {
			const updateTheme = () => {
				const docTheme = getDocumentTheme();
				tailwindTheme = docTheme ?? getSystemTheme();
			};

			updateTheme();

			const observer = new MutationObserver(updateTheme);
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['class']
			});

			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			const handleSystemChange = (e: MediaQueryListEvent) => {
				if (!getDocumentTheme()) {
					tailwindTheme = e.matches ? 'dark' : 'light';
				}
			};
			mediaQuery.addEventListener('change', handleSystemChange);

			onDestroy(() => {
				observer.disconnect();
				mediaQuery.removeEventListener('change', handleSystemChange);
			});
		}

		const mapInstance = new MapLibreGL.Map({
			container: mapContainer,
			style: currentStyle,
			fadeDuration: 0,
			renderWorldCopies: false,
			attributionControl: { compact: true },
			center: viewport?.center ?? center,
			zoom: viewport?.zoom ?? zoom,
			bearing: viewport?.bearing ?? 0,
			pitch: viewport?.pitch ?? 0,
			...options
		});

		mapInstance.on('load', () => {
			isLoaded = true;
			mapInstance.setPadding(padding);
		});

		const styleDataHandler = () => {
			clearStyleTimeout();
			styleTimeoutId = setTimeout(() => {
				isStyleLoaded = true;
				if (!initialStyleApplied) initialStyleApplied = true;
				if (!hasInitiallyLoaded) hasInitiallyLoaded = true;
				if (projection) mapInstance.setProjection(projection);
				mapInstance.setPadding(padding);
			}, 100);
		};

		const handleMove = () => {
			if (internalUpdate) return;
			onviewportchange?.(getViewport(mapInstance));
		};

		mapInstance.on('styledata', styleDataHandler);
		mapInstance.on('move', handleMove);

		mapInstance.on('dragstart', () => (isInteracting = true));
		mapInstance.on('dragend', () => (isInteracting = false));
		mapInstance.on('zoomstart', () => (isInteracting = true));
		mapInstance.on('zoomend', () => (isInteracting = false));
		mapInstance.on('rotatestart', () => (isInteracting = true));
		mapInstance.on('rotateend', () => (isInteracting = false));
		mapInstance.on('pitchstart', () => (isInteracting = true));
		mapInstance.on('pitchend', () => (isInteracting = false));

		map = mapInstance;
	});

	$effect(() => {
		if (!map || !isControlled || !viewport) return;
		if (map.isMoving()) return;

		const current = getViewport(map!);
		const next = {
			center: viewport.center ?? current.center,
			zoom: viewport.zoom ?? current.zoom,
			bearing: viewport.bearing ?? current.bearing,
			pitch: viewport.pitch ?? current.pitch
		};

		if (
			next.center[0] === current.center[0] &&
			next.center[1] === current.center[1] &&
			next.zoom === current.zoom &&
			next.bearing === current.bearing &&
			next.pitch === current.pitch
		) {
			return;
		}

		internalUpdate = true;
		map!.once('moveend', () => {
			internalUpdate = false;
		});
		map!.jumpTo(next);
		map!.setPadding(padding);
	});

	$effect(() => {
		const style = currentStyle;

		if (!map || !initialStyleApplied) {
			return;
		}

		untrack(() => {
			const m = map!;
			const currCenter = m.getCenter();
			const currZoom = m.getZoom();
			const currBearing = m.getBearing();
			const currPitch = m.getPitch();

			isStyleLoaded = false;
			m.setStyle(style, { diff: true });

			m.once('styledata', () => {
				m.jumpTo({
					center: currCenter,
					zoom: currZoom,
					bearing: currBearing,
					pitch: currPitch
				});
				m.setPadding(padding);
			});
		});
	});

	$effect(() => {
		if (!map || !isReady || isInteracting || initialCenterZoomApplied || isControlled) {
			return;
		}

		initialCenterZoomApplied = true;

		const [lng, lat] = center;

		untrack(() => {
			map!.easeTo({
				center: [lng, lat],
				zoom,
				padding
			});
		});
	});

	$effect(() => {
		if (map) {
			map.setPadding(padding);
		}
	});

	onDestroy(() => {
		map?.remove();
		map = null;
		isLoaded = false;
		isStyleLoaded = false;
	});
</script>

<div bind:this={mapContainer} class="relative h-full w-full">
	{#if !isReady}
		<div class="absolute inset-0 flex items-center justify-center">
			<div class="flex gap-1">
				<span class="size-1.5 animate-pulse rounded-full bg-muted-foreground/60"></span>
				<span
					class="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]"
				></span>
				<span
					class="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]"
				></span>
			</div>
		</div>
	{/if}
	{#if hasInitiallyLoaded}
		{@render children?.()}
	{/if}
</div>
