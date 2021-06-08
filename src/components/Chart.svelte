<script>
	/**
	 * Inspired from this:
	 * https://github.com/SauravKanchan/svelte-chartjs/blob/master/src/Base.svelte
	 * But manually added to allow use of chartjs v3.x, while the library only uses chartjs 2.9.4 ATM
	 */
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';
	Chart.register(annotationPlugin);
	export let data = {
		labels: [],
		datasets: [{ values: [] }],
		yMarkers: {},
		yRegions: []
	};
	export let type = 'line';
	export let options = {};
	export let plugins = {};
	let chart = null;
	let chartRef;
	onMount(() => {
		chart = new Chart(chartRef, {
			type,
			data,
			options,
			plugins
		});
	});
	afterUpdate(() => {
		if (!chart) return;
		chart.type = type;
		chart.data = data;
		chart.options = options;
		chart.plugins = plugins;
		chart.update();
	});
	onDestroy(() => {
		chart = null;
	});
</script>

<canvas bind:this={chartRef} />
