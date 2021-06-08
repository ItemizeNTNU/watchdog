<script context="module">
	export async function preload() {
		const scopes = await this.fetch('/api/stats/scopes');
		const system = await this.fetch('/api/stats/system');
		return { data: { data: await scopes.json(), lastRefresh: Date.now() }, system: await system.json() };
	}
</script>

<script>
	import Button from '../../components/Button.svelte';
	import { capitalize } from '../../utils/text';
	import SpikeTimeChart from '../../components/SpikeTimeChart.svelte';
	import { onMount } from 'svelte';
	import moment from 'moment';
	import filesize from 'filesize';

	export let data;
	export let system;

	const avg = (l) => {
		const sum = l.reduce((t, n) => t + n, 0);
		return Math.round((l.length ? sum / l.length : 0) * 100);
	};
	const toggleHealth = async (scan) => {
		if (!scan) return;
		scan.hideChart = true;
		data = data;
		await fetch(`/api/scan/health/${scan._id}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ok: !scan.ok })
		});
		await refresh();
	};

	const refreshInterval = 2 * 60 * 1000;
	const refresh = async () => {
		const resData = await fetch('/api/stats/scopes');
		data = { data: await resData.json(), lastRefresh: Date.now() };
		const resSystem = await fetch('/api/stats/system');
		system = await resSystem.json();
	};

	onMount(() => {
		setInterval(() => {
			data = data;
		}, 10000);
		setInterval(refresh, refreshInterval);
	});
</script>

<card>
	<h1>Scopes:</h1>
	<a href="/admin/scope">Configure Scopes</a>
	<h2 class="right">Refresh in <Button small clear submit={refresh}><code class="thin">{moment(data.lastRefresh + refreshInterval).fromNow()}</code></Button></h2>
</card>

<card>
	<div class="row">
		<div class="max">
			<h2>Scopes:</h2>
			<h3>Size: <code>{filesize(system.scopes.totalSize)}</code></h3>
			<h3>Documents: <code>{system.scopes.count}</code></h3>
			<h3>Avg Size: <code>{filesize(system.scopes.avgObjSize)}</code></h3>
		</div>
		<hr />
		<div class="max">
			<h2>Scans:</h2>
			<h3>Size: <code>{filesize(system.scans.totalSize)}</code></h3>
			<h3>Documents: <code>{system.scans.count}</code></h3>
			<h3>Avg Size: <code>{filesize(system.scans.avgObjSize)}</code></h3>
		</div>
	</div>
	<hr />
	<h3>Last scan: <code>{moment(system.lastScan).fromNow()}</code></h3>
	<code class="block">
		{JSON.stringify(system.current, null, 2)}
	</code>
</card>

{#each data.data as graph}
	<card class:disabled={graph.scope.disabled} id={graph.scope._id}>
		<h1>{graph.scope.type == 'ip' ? 'IP' : capitalize(graph.scope.type)}: <code>{graph.scope.value}</code></h1>
		<h2>Last scanned <code>{graph.scope.last_scan ? moment(graph.scope.last_scan.date).fromNow() : 'N/A'}</code></h2>
		<h2>Last time used <code>{graph.scope.last_scan ? graph.scope.last_scan.time : 'N/A'} seconds</code></h2>
		<div class="right">
			{#if graph.scope.parent}
				<Button small clear href="#{graph.scope.parent}">
					<h2 class="thin">Parent^</h2>
				</Button>
			{/if}
			{#if graph.scope.disabled}
				<Button small clear disabled>
					<h2 class="thin">Disabled</h2>
				</Button>
			{/if}
			<Button small clear submit={() => toggleHealth(graph.scope.last_scan)}>
				<h2 class="health thin" class:error={!graph.scope.last_scan?.ok}>{graph.scope.last_scan ? avg(graph.data.map((n) => n.ok)) : 'N/A'}%</h2>
			</Button>
		</div>

		<SpikeTimeChart
			dates={graph.data.map((n) => new Date(n.date))}
			values={graph.data.map((n) => n.ok)}
			color={graph.scope.last_scan?.ok ? '#7cd6fd' : '#ff6565'}
			tooltipValueFormat={(n) => (n == 1 ? 'OK' : 'Down')}
			min={{ x: moment().subtract(1, 'day').toDate(), y: -0.05 }}
			max={{ x: moment().toDate(), y: 1.05 }} />
		<h3>Scan time:</h3>
		<SpikeTimeChart
			dates={graph.data.map((n) => new Date(n.date))}
			values={graph.data.map((n) => n.time)}
			color={graph.scope.last_scan?.ok ? '#7cd6fd' : '#ff6565'}
			tooltipValueFormat={(n) => n.toFixed(3) + ' seconds'}
			stats
			height={100}
			min={{ x: moment().subtract(1, 'day').toDate() }}
			max={{ x: moment().toDate() }} />

		<div class="output">
			{#if graph.scope.last_scan}
				{#if graph.scope.last_scan.output.error}
					<code class="block">
						{graph.scope.last_scan.output.error.message ? graph.scope.last_scan.output.error.message : graph.scope.last_scan.output.error}
					</code>
				{:else if graph.scope.type == 'ip'}
					<h3>Open ports: <code>{graph.scope.last_scan.output.total.join(', ')}</code></h3>
				{:else if graph.scope.type == 'domain'}
					<h3>IPs: <code class="block">{graph.scope.last_scan.output.dns.total.sort().join('\n')}</code></h3>
					{#if graph.scope.settings.subdomains}
						<h3>Subdomains: <code class="block">{graph.scope.last_scan.output.crtsh.total.sort().join('\n')}</code></h3>
					{/if}
				{:else if graph.scope.type == 'endpoint'}
					<h3>Status Code: <code>{graph.scope.last_scan.output.total.status}</code></h3>
					<h3>Content Length: <code>{graph.scope.last_scan.output.total.content_length}</code></h3>
					{#if graph.scope.settings.subdomains}
						<h3>Regex: <code>{graph.scope.settings.regex ? graph.scope.last_scan.output.regex : 'Disabled'}</code></h3>
					{/if}
				{/if}
			{:else}
				<h3>Output: <code>N/A</code></h3>
			{/if}
		</div>
	</card>
{:else}
	<card>
		<i>No data has been collected from scans yet. Try adding scopes first.</i>
	</card>
{/each}

<style>
	:global(.chart-container .axis, .chart-container .chart-label, .graph-svg-tip.comparison) {
		display: none; /* Hides legends, axis and tooltip */
	}
	.right {
		position: absolute;
		top: 0;
		right: 0;
		padding: 0.5em;
		text-align: right;
	}
	.health {
		color: var(--success);
	}
	.thin {
		margin: 0;
	}
	.error {
		color: var(--error-text);
	}
	.max {
		width: max-content;
	}
</style>
