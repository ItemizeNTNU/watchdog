<script>
	import Chart from './Chart.svelte';
	import 'chartjs-adapter-moment'; // load time adapter
	import moment from 'moment';

	export let dates;
	export let values;

	export let min = { x: null, y: null };
	export let max = { x: null, y: null };
	export let grid = { x: false, y: false };
	export let ticks = { x: false, y: false };
	export let tooltipValueFormat = undefined;
	$: format = tooltipValueFormat ? tooltipValueFormat : (n) => n.toFixed(3);
	export let stats = false;
	export let height = 75;

	export let color = '#7cd6fd';
	$: colorFaded1 = color + '40';
	$: colorFaded2 = color + '04';

	// gradient is ran for all data points, lets do some caching
	let gradientCache = {
		width: 0,
		height: 0,
		gradient: 0,
		colors: []
	};

	const getGradient = (...colors) => (context) => {
		const { chart } = context;
		const { ctx, chartArea } = chart;
		if (!chartArea || colors.length == 0) return null;
		if (colors.length == 1) return colors[0];
		const chartWidth = chartArea.right - chartArea.left;
		const chartHeight = chartArea.bottom - chartArea.top;
		if (!gradientCache.gradient || gradientCache.width != chartWidth || gradientCache.height != chartHeight || String(gradientCache.colors) != String(colors)) {
			gradientCache.height = chartHeight;
			gradientCache.width = chartWidth;
			gradientCache.gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
			colors.forEach((c, n) => gradientCache.gradient.addColorStop(1 - n / (colors.length - 1), c));
		}
		return gradientCache.gradient;
	};

	let data;
	$: {
		data = {
			labels: dates,
			datasets: [
				{
					data: values,
					borderColor: color,
					backgroundColor: getGradient(colorFaded1, colorFaded2),
					fill: 'start',
					hitRadius: 30,
					pointBorderColor: colorFaded1,
					pointRadius: 1,
					pointBackgroundColor: '#0000',
					pointHoverBorderColor: color,
					pointHoverBackgroundColor: colorFaded1
				}
			]
		};
	}

	let maxValue, avgValue, minValue;

	$: {
		maxValue = values.reduce((a, b) => Math.max(a, b), 0);
		minValue = values.reduce((a, b) => Math.min(a, b), 0);
		avgValue = values.reduce((a, b) => a + b, 0) / values.length || 0;
	}

	$: annotation = !(stats && values.length > 0)
		? {}
		: {
				annotations: {
					max: {
						type: 'line',
						scaleID: 'y',
						value: maxValue,
						borderDash: [5, 5],
						label: {
							content: `max: ${maxValue.toFixed(1)}`,
							enabled: true,
							backgroundColor: '#6664',
							position: 'start',
							//font: { style: 'normal' }
							color: '#ccc',
							borderRadius: 0
						}
					},
					avg: {
						type: 'line',
						scaleID: 'y',
						value: avgValue,
						borderDash: [5, 5],
						label: {
							content: `avg: ${avgValue.toFixed(1)}`,
							enabled: true,
							backgroundColor: '#6664',
							position: 'start',
							//font: { style: 'normal' }
							color: '#ccc',
							borderRadius: 0
						}
					}
				}
		  };
	let tooltip = 0;
	$: options = {
		animation: false,
		maintainAspectRatio: false,
		devicePixelRatio: Math.max(2, typeof window == 'undefined' ? 1 : window.devicePixelRatio),
		plugins: {
			legend: {
				display: false
			},
			tooltip: {
				enabled: false,
				external: (ctx) => {
					if (!ctx.tooltip.opacity) {
						tooltip = 0;
					} else {
						tooltip = {
							text: moment(ctx.tooltip.dataPoints[0].parsed.x).calendar(),
							value: tooltipValueFormat ? tooltipValueFormat(ctx.tooltip.dataPoints[0].parsed.y) : 0,
							style: `--x: ${ctx.tooltip.caretX + 'px'}; --y: ${ctx.tooltip.caretY + 'px'};`
						};
					}
				}
			},
			annotation
		},
		spanGaps: 16 * 60 * 1000, // data is grupped in 15 min, gap bigger then that means missing data point
		scales: {
			x: {
				min: min?.x,
				max: max?.x,
				type: 'time',
				grid: {
					display: grid.x
				},
				ticks: {
					display: ticks.x
				}
				//offset: stats
			},
			y: {
				min: min?.y,
				max: max?.y,
				grid: {
					display: grid.y
				},
				ticks: {
					display: ticks.y
				}
				//offset: stats
			}
		}
	};
</script>

<div class="chart" style={`--height: ${height}px;`}>
	{#if tooltip}
		<div class="tooltip" style={tooltip.style}>
			<h3>{tooltip.text}</h3>
			{#if tooltip.value}
				<p>{tooltip.value}</p>
			{/if}
		</div>
	{/if}
	<Chart {options} {data} />
</div>

<style>
	.chart {
		--height: 75px;
		position: relative;
		height: var(--height);
		margin-top: 2em;
	}
	.tooltip {
		--x: 0;
		--y: 0;
		position: absolute;
		font-size: 0.9em;
		transform: translate(-50%, -130%);
		left: var(--x);
		top: var(--y);
		background: var(--darker);
		border-radius: 0.125em;
		padding: 0.25em;
		width: max-content;
		pointer-events: none;
	}
	.tooltip * {
		margin: 0;
	}
</style>
