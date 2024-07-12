(function() {
	"use strict";

	const version = "2";
	const cacheName = version + "::hirewilto:";

	const staticCacheName = cacheName + "static";
	const pagesCacheName = cacheName + "pages";
	const imagesCacheName = cacheName + "images";

	const offlinePages = [
		"/"
	];
	const staticAssets = [
	];

	function updateStaticCache() {
		// These items won't block the installation of the Service Worker
		caches.open( staticCacheName )
			.then( cache => {
				// These items must be cached for the Service Worker to complete installation
				return cache.addAll( offlinePages.map( url => new Request( url, { credentials: 'include' } ) ) );
			});

		// These items must be cached for the Service Worker to complete installation
		return caches.open( staticCacheName )
			.then( cache => {
				return cache.addAll( staticAssets.map( url => new Request( url, { credentials: 'include' } ) ) );
			});
	}

	function stashInCache( cacheName, request, response ) {
		caches.open( cacheName )
			.then( cache => cache.put(request, response ) );
	}

	// Limit the number of items in a specified cache.
	function trimCache( cacheName, maxItems ) {
		caches.open( cacheName )
			.then( cache => {
				cache.keys()
					.then( keys => {
						if ( keys.length > maxItems ) {
							cache.delete( keys[ 0 ] )
								.then( trimCache( cacheName, maxItems ) );
						}
					} );
			});
	}

	// Remove caches whose name is no longer valid
	function clearOldCaches() {
		return caches.keys()
			.then( keys => {
				return Promise.all( keys
					.filter( key => key.indexOf( version ) !== 0)
					.map( key => caches.delete( key ) )
				);
			});
	}

	// Events!
	self.addEventListener( "message", event => {
		if ( event.data.command == "trimCaches" ) {
			trimCache( pagesCacheName, 35 );
			trimCache( imagesCacheName, 20 );
		}

		if ( event.data == "getCached" ) {
			caches.open( pagesCacheName ).then(function(cache) {
				return cache.keys().then(function(requests) {
					var urls = requests.filter(function(request){
						return request.url.indexOf("/offline/") === -1;
					}).map(function(request) {
						return request.url;
					});
					return urls.sort();
				}).then(function(urls) {
					event.ports[0].postMessage({
						"offline" : true,
						"urls" : urls
					});
				});
			});
		}
	});

	self.addEventListener( "install", event => {
		event.waitUntil( updateStaticCache()
			.then( () => self.skipWaiting() )
		);
	});

	self.addEventListener( "activate", event => {
		event.waitUntil( clearOldCaches()
			.then( () => self.clients.claim() )
		);
	});

	self.addEventListener( "fetch", event => {
		let request = event.request;
		let client = event.clientId;
		let url = new URL( request.url );

		// Ignore non-GET requests
		if ( request.method !== "GET" ) {
			return;
		}

		// For HTML requests, try the network first, fall back to the cache, finally the offline page
		if ( request.headers.get( "Accept" ).indexOf( "text/html" ) !== -1 ) {

			// Ignore query-string’d requests
			if ( request.url.indexOf( "?" ) !== -1 ) {
				return;
			}

			event.respondWith(
				fetch( request )
					.then( response => {
						// NETWORK
						// Stash a copy of this page in the pages cache
						let copy = response.clone();
						if ( offlinePages.includes( url.pathname ) || offlinePages.includes( url.pathname + "/" ) ) {
							stashInCache( staticCacheName, request, copy );
						} else {
							stashInCache( pagesCacheName, request, copy );
						}
						return response;
					} )
					.catch( () => {
						// CACHE or FALLBACK
						return caches.match( request )
							.then( response => response || caches.match( "/offline/" ) );
					} )
			);
			return;

		}

		// For non-HTML requests, look in the cache first, fall back to the network
		event.respondWith(
			caches.match( request )
				.then( response => {
					// CACHE
					return response || fetch( request )
						.then( response => {
							// NETWORK
							// If the request is for an image, stash a copy of this image in the images cache
							if ( request.headers.get( "Accept" ).indexOf( "image" ) !== -1 ) {
								let copy = response.clone();
								stashInCache( imagesCacheName, request, copy );
							}
							return response;
						})
						.catch( () => {
							// OFFLINE
							// If the request is for an image, show an offline placeholder
							if ( request.headers.get( "Accept" ).indexOf( "image" ) !== -1 ) {
								return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="75"><g opacity=".494"><g fill="#000" fill-rule="evenodd" opacity=".153"><path d="M47.275 22.183c-1.4 1.637-2.462 2.142-3.217 2.142-.723 0-.996-.556-.996-1.191 0-.175.017-.354.05-.538-1.15 1.31-1.969 1.729-2.668 1.729-.707 0-.98-.556-.98-1.191 0-.197.022-.399.064-.606-1.202 1.357-2.052 1.797-2.763 1.797-.706 0-.98-.556-.98-1.191 0-1.128.723-2.446 1.816-3.94l1.461-2.08c.08-.095.241-.095.305 0 .193.254.29.556.29.858 0 .286-.097.572-.274.826l-1.188 1.683c-.402.604-1.06 1.636-1.06 2.383 0 .254.096.397.273.397.74 0 1.969-1.347 3.09-2.93.226-.367.483-.746.765-1.136l4.24-5.972c.08-.111.225-.111.306 0 .208.286.305.54.305.842 0 .302-.097.556-.29.826l-3.95 5.59c-.402.62-1.061 1.652-1.061 2.383 0 .254.08.413.273.413.71 0 1.886-1.304 2.958-2.844.246-.398.532-.811.849-1.238l1.06-1.509c.064-.095 0-.206-.096-.206h-.113a.293.293 0 0 1-.305-.302c0-.127.08-.27.209-.27h.755c.064 0 .128-.016.16-.064l1.366-1.953c.096-.127.273-.08.321-.016.209.27.305.54.305.842 0 .317-.112.603-.289.857-.112.159-.016.334.145.334h.144c.177 0 .305.159.305.302 0 .174-.128.27-.224.27h-.916c-.08 0-.129.031-.16.095L45.47 20.48c-.401.62-1.044 1.652-1.044 2.383 0 .27.097.413.273.413.748 0 2.054-1.225 3.275-2.978 1.007-1.732 2.901-3.391 4.58-3.391.674 0 1.317.413 1.317 1.397 0 1.287-.883 3.209-2.168 4.527-.097.095 0 .238.128.19 1.157-.444 2.024-1.286 3.229-2.89.273.032.369.302.32.572-.706 1.016-2.714 3.62-6.231 3.62-1.109 0-1.896-.523-1.896-1.81 0-.107.007-.217.021-.33zM40.733 12c1.076 0 1.75.699 1.75 1.715 0 1.27-.787 2.43-1.686 2.43-.29 0-.482-.222-.482-.524 0-.572.578-1.191 1.076-1.191.097 0 .145.016.193.016.145 0 .29-.207.29-.667 0-.667-.354-1.223-1.11-1.223-3.806 0-5.67 12.293-10.745 12.293-1.414 0-2.265-1.032-2.377-2.319-.016-.175-.241-.238-.354-.111-1.044 1.255-2.441 2.43-3.823 2.43-1.461 0-2.28-1.128-2.28-2.636 0-4.511 7.372-7.56 7.372-9.038 0-.397-.482-.571-1.253-.571-3.678 0-7.147 2.715-7.147 4.526 0 .572.353.985.995 1.017.193.015.273.27.097.38-.241.16-.53.239-.852.239-.787 0-1.397-.524-1.397-1.493 0-2.255 3.935-5.257 8.112-5.257 1.734 0 2.168.62 2.168 1.16 0 2.27-6.586 5.13-6.586 9.052 0 .937.45 1.557 1.125 1.557 1.012 0 2.538-1.302 4.015-3.367l4.787-6.734a.196.196 0 0 1 .321 0c.193.254.29.555.29.873 0 .302-.097.588-.274.842l-2.393 3.383c-1.108 1.556-1.413 2.478-1.413 3.351 0 1.08.53 1.652 1.3 1.652C34.55 23.785 34.87 12 40.733 12zm11.71 5.48c-1.27 0-3.888 3.271-3.888 5.177 0 .302.113.636.498.636 1.301 0 3.968-3.177 3.968-5.035 0-.43-.145-.778-.579-.778zM26.82 38.588l-2.631-9.162h-.08c.124 1.56.185 2.772.185 3.637v5.525h-3.08V25.867h4.629l2.684 9.032h.07l2.631-9.032h4.638v12.72H32.67V33.01c0-.29.005-.612.014-.965.008-.354.048-1.221.118-2.602h-.079l-2.596 9.145H26.82zm19.262 0l-.634-2.384h-4.18l-.65 2.384h-3.82l4.198-12.773h4.637l4.25 12.773h-3.801zm-1.355-5.203l-.554-2.089a75.92 75.92 0 0 1-.471-1.8 29.085 29.085 0 0 1-.365-1.584c-.053.295-.157.783-.313 1.461-.155.68-.5 2.016-1.034 4.012h2.737zm17.089 5.203H57.89l-2.543-4.864-1.03.609v4.255h-3.493V25.867h3.494v5.525c.176-.342.53-.885 1.064-1.627l2.702-3.898h3.801l-4.056 5.7 3.986 7.02zm8.58 0h-7.638V25.867h7.638v2.758h-4.163v2.001h3.855v2.759h-3.855v2.401h4.163v2.802zm10.216-3.864c0 .79-.202 1.49-.607 2.102-.405.612-.989 1.087-1.751 1.427-.763.34-1.657.509-2.684.509-.857 0-1.575-.06-2.156-.179a8.065 8.065 0 0 1-1.813-.622V34.9c.663.336 1.353.598 2.068.787.716.188 1.373.283 1.971.283.517 0 .895-.089 1.135-.266.241-.177.361-.404.361-.683a.746.746 0 0 0-.145-.456 1.685 1.685 0 0 0-.466-.396c-.214-.134-.785-.406-1.712-.818-.839-.377-1.468-.743-1.887-1.097a3.37 3.37 0 0 1-.933-1.218c-.202-.458-.304-1-.304-1.627 0-1.172.431-2.085 1.294-2.74.862-.656 2.047-.984 3.555-.984 1.332 0 2.69.305 4.074.914l-1.065 2.654c-1.202-.546-2.24-.818-3.115-.818-.451 0-.78.078-.985.235-.206.156-.308.35-.308.583 0 .249.13.472.391.67.261.197.97.556 2.125 1.078 1.11.494 1.88 1.023 2.31 1.588.431.566.647 1.278.647 2.136zM27.321 44.887v4.69h4.403v4.438H27.32v8.93h-6.107V40.478H33.23v4.41H27.32zm15.514.955c0-.3-.123-.534-.37-.702-.245-.169-.548-.253-.908-.253s-.663.084-.909.253a.805.805 0 0 0-.37.702v11.74c0 .299.124.533.37.701.246.169.55.253.909.253.36 0 .663-.084.909-.253a.805.805 0 0 0 .37-.702v-11.74zm6.249 12.104c0 .768-.19 1.489-.568 2.163a5.71 5.71 0 0 1-1.577 1.77c-.672.505-1.467.903-2.385 1.193-.919.29-1.918.435-2.997.435-1.08 0-2.078-.145-2.997-.435-.918-.29-1.713-.688-2.385-1.194a5.71 5.71 0 0 1-1.577-1.769 4.345 4.345 0 0 1-.568-2.163v-12.47c0-.767.19-1.488.568-2.162a5.71 5.71 0 0 1 1.577-1.77c.672-.505 1.467-.903 2.385-1.193.919-.29 1.918-.435 2.997-.435 1.08 0 2.078.145 2.997.435.918.29 1.713.688 2.385 1.194a5.71 5.71 0 0 1 1.577 1.77c.379.673.568 1.394.568 2.162v12.47zm10.06-12.104c0-.3-.122-.534-.369-.702-.246-.169-.549-.253-.909-.253s-.662.084-.908.253a.805.805 0 0 0-.37.702v11.74c0 .299.123.533.37.701.246.169.549.253.908.253.36 0 .663-.084.91-.253a.805.805 0 0 0 .369-.702v-11.74zm6.25 12.104c0 .768-.19 1.489-.569 2.163a5.71 5.71 0 0 1-1.576 1.77c-.672.505-1.468.903-2.386 1.193-.918.29-1.917.435-2.997.435-1.079 0-2.078-.145-2.996-.435-.918-.29-1.714-.688-2.386-1.194a5.71 5.71 0 0 1-1.576-1.769 4.345 4.345 0 0 1-.568-2.163v-12.47c0-.767.189-1.488.568-2.162a5.71 5.71 0 0 1 1.576-1.77c.672-.505 1.468-.903 2.386-1.193.918-.29 1.917-.435 2.996-.435 1.08 0 2.079.145 2.997.435.918.29 1.714.688 2.386 1.194a5.71 5.71 0 0 1 1.576 1.77c.379.673.568 1.394.568 2.162v12.47zm9.748-12.02c0-.6-.35-.899-1.051-.899h-1.165v13.397h1.165c.7 0 1.05-.3 1.05-.899V45.926zm5.737 12.357c0 .712-.147 1.353-.44 1.924a4.712 4.712 0 0 1-1.179 1.475 5.168 5.168 0 0 1-1.718.94 6.628 6.628 0 0 1-2.088.324h-8.635V40.477h8.635c.739 0 1.434.108 2.088.323a5.168 5.168 0 0 1 1.718.941c.492.412.885.904 1.179 1.475.293.57.44 1.212.44 1.924v13.143z"/></g></g></svg>', {headers: {"Content-Type": "image/svg+xml", "Cache-Control": "no-store"}});
							}
						});
				})
		);
	});
} )();