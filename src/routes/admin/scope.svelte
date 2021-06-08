<script context="module">
	export async function preload(page, session) {
		const scopes = await (await this.fetch('/api/scopes')).json();
		return { scopes };
	}
</script>

<script>
	import Button from '../../components/Button.svelte';
	import FaTrashAlt from 'svelte-icons/fa/FaTrashAlt.svelte';
	import { scale } from 'svelte/transition';
	import FaCog from 'svelte-icons/fa/FaCog.svelte';

	export let scopes;

	const types = ['domain', 'ip', 'endpoint'];

	const refresh = async () => {
		scopes = await (await fetch('/api/scopes')).json();
	};

	const defaultScope = {
		type: types[0],
		value: '',
		settings: {},
		disabled: false
	};
	let newScope = { ...defaultScope };
	let error = '';
	const submit = async () => {
		error = '';
		const res = await fetch('/api/scopes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(newScope)
		});
		if (!res.ok) {
			try {
				error = (await res.json()).msg;
			} catch {
				error = res.statusText;
			}
			return;
		}
		newScope = { ...defaultScope };
		await refresh();
	};
	const remove = async (scope) => {
		error = '';
		const res = await fetch(`/api/scope/${scope._id}`, {
			method: 'DELETE'
		});
		if (!res.ok) {
			try {
				error = (await res.json()).msg;
			} catch {
				error = res.statusText;
			}
			return;
		}
		await refresh();
	};
</script>

<div class="columns">
	<div>
		<card>
			<h1>Scope:</h1>
		</card>
		{#each scopes as scope}
			<card>
				<div class="tools">
					<Button small icon={FaCog} submit={() => (newScope = scope)} />
					<Button small type="error" icon={FaTrashAlt} submit={async () => await remove(scope)} />
				</div>
				<table>
					<tr>
						<td>Type:</td>
						<td><code>{scope.type}</code></td>
					</tr>
					<tr>
						<td>Value:</td>
						<td><code>{scope.value}</code></td>
					</tr>
					{#each Object.entries(scope.settings) as [key, value]}
						<tr>
							<td>{{ ports: 'Nmap Ports', subdomains: 'Monitor Subdomains', content_length: 'Content Length' }[key] || key[0].toUpperCase() + key.slice(1)}:</td>
							<td><code>{value}</code></td>
						</tr>
					{/each}
					<tr>
						<td>Disabled:</td>
						<td><code>{!!scope.disabled}</code></td>
					</tr>
				</table>
			</card>
		{:else}
			<card>
				<i>No scopes defined yet</i>
			</card>
		{/each}
	</div>
	<card class="editor">
		<h2>{newScope._id ? 'Update scope' : 'Add new scope'}</h2>
		{#if error}
			<p class="error">{error}</p>
		{/if}
		<table>
			<tr>
				<td>Type:</td>
				<td>
					<select bind:value={newScope.type} on:input={(newScope.settings = {})}>
						{#each types as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</td>
			</tr>
			<tr>
				<td>Value:</td>
				<td><input type="text" bind:value={newScope.value} /></td>
			</tr>
			{#if newScope.type == 'ip'}
				<tr in:scale={{ delay: 400 }} out:scale>
					<td>Nmap Ports:</td>
					<td><input type="text" bind:value={newScope.settings.ports} /></td>
					<td>e.g. <code>1-100,200</code></td>
				</tr>
			{:else if newScope.type == 'domain'}
				<tr in:scale={{ delay: 400 }} out:scale>
					<td>Monitor New Subdomains:</td>
					<td><input type="checkbox" bind:checked={newScope.settings.subdomains} /></td>
				</tr>
			{:else if newScope.type == 'endpoint'}
				<tr in:scale={{ delay: 400 }} out:scale>
					<td>Matches Regex:</td>
					<td><input type="text" bind:value={newScope.settings.regex} /></td>
				</tr>
			{/if}
			<tr>
				<td>Disabled:</td>
				<td><input type="checkbox" bind:checked={newScope.disabled} /></td>
			</tr>
			<tr>
				<td />
				<td><Button {submit}>{newScope._id ? 'Update' : 'Add'}</Button></td>
			</tr>
		</table>
	</card>
</div>

<style>
	.columns {
		display: flex;
		flex-direction: row;
		justify-content: stretch;
		align-items: flex-start;
	}
	.columns > * {
		flex: 1 1 0;
	}
	.editor {
		flex-grow: 0;
	}
	table {
		min-width: max-content;
	}
	.tools {
		position: absolute;
		right: 0;
		top: 0;
		display: flex;
		flex-direction: row;
		padding: 0.25em;
	}
</style>
