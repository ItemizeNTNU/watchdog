<script context="module">
	export async function preload(page, session) {
		return { userData: session?.user };
	}
</script>

<script>
	import Nav from '../components/Nav.svelte';
	import { user } from '../utils/stores';
	import moment from 'moment';
	import 'moment/locale/en-gb';
	import { onMount } from 'svelte';

	moment.locale('en-gb');

	onMount(() => {
		const locale = ['en', 'en-us'].includes((window?.navigator?.userLanguage || window?.navigator?.language).toLowerCase()) ? 'en' : 'en-gb';
		moment.locale(locale);
	});

	export let segment;
	export let userData;
	$user = userData;
</script>

<Nav {segment} />

<main>
	<slot />
</main>

<style>
	main {
		position: relative;
		max-width: 80em;
		padding: 2em;
		margin: 0 auto;
	}
</style>
