angular.module('mip.map').factory('MapService', [
	'$rootScope', '$http', '$q', 'KiinteistoService', 'RakennusService',
	'CONFIG', 'AlueService', 'ArvoalueService', 'PorrashuoneService', 'locale',
	'CacheFactory', 'AlertService', 'ListService', 'FeatureStyleService', 'KohdeService',
	'TutkimusService', '$filter',
	function ($rootScope, $http, $q, KiinteistoService, RakennusService,
		CONFIG, AlueService, ArvoalueService, PorrashuoneService, locale,
		CacheFactory, AlertService, ListService, FeatureStyleService, KohdeService,
		TutkimusService, $filter) {

		CacheFactory('mapCache', {
			maxAge: 10 * 60 * 1000, // Items added to this cache expire after 10 minutes
			cacheFlushInterval: 60 * 60 * 1000, // This cache will clear itself every hour
			deleteOnExpire: 'passive', // Cache will do nothing when an item expires. Expired items will remain in the cache until requested, at which point they are removed, and undefined is returned.
			capacity: 50 // Maximum number of items a cache can hold. Adding more items than the capacity will cause the cache to operate like an LRU cache, removing the least recently used items to stay under capacity. Default: Number.MAX_VALUE.
		});

		var defaultLayer = "";

		var projection = $rootScope.projection;
		var projectionExtent = projection.getExtent();
		var size = ol.extent.getWidth(projectionExtent) / 256;
		var resolutions = [
			8192.00000000000000000000, 4096.00000000000000000000, 2048.00000000000000000000, 1024.00000000000000000000, 512.00000000000000000000, 256.00000000000000000000,
			128.00000000000000000000, 64.00000000000000000000, 32.00000000000000000000, 16.00000000000000000000, 8.00000000000000000000, 4.00000000000000000000,
			2.00000000000000000000, 1.00000000000000000000, 0.50000000000000000000, 0.25000000000000000000
		];
		var matrixIds = new Array(16);
		for (var z = 0; z < 16; ++z) {
			// generate resolutions and matrixIds arrays for this WMTS
			resolutions[z] = size / Math.pow(2, z);
			matrixIds[z] = z;
		}

		var userLayers = ["Taustakartta"]; // Default map layer
		var userMapLayerValues = [];
		var userZoom = 12;

		var needToCenter = false;
		var extent = null;
		var centerToObject = null;

		var mapServiceFunctions = {
			setNeedToCenter: function (value) {
				needToCenter = value;
			},
			getNeedToCenter: function () {
				return needToCenter;
			},
			setCenterToObject: function (value) {
				centerToObject = value;
			},
			setUserLayers: function (layers) {
				userLayers = layers;
			},
			getUserLayers: function () {
				// Users select the layers so that the base layers are on the bottom and the other layers are on top. We need to reverse the order so the layers are added
				// on the map in the same order
				return userLayers;
			},
			setUserMapLayerValues: function (values) {
				userMapLayerValues = values;
			},
			getUserMapLayerValues: function () {
				return userMapLayerValues;
			},
			/*
			 * Tallennetaan käyttäjän valitsemat karttatasojen järjestys ja läpinäkyvyys arvot.
			 * Tiedot säilytetään Service-tasolla, ei viedä kantaan.
			 */
			storeUserMapLayerValues: function (layers, editLayer) {
				var layerValues = this.getUserMapLayerValues();
				var layerValue = { 'nimi': editLayer.name, 'zIndex': editLayer.zIndex, 'opacity': editLayer.opacity };

				// Muutetun layerin zIndex paikoilleen
				for (var i = 0; i < layers.array_.length; i++) {
					if (layers.array_[i].values_.name == editLayer.name) {
						layers.array_[i].setZIndex(editLayer.zIndex);
						break;
					}
				}

				// Ensimmäinen lisäys
				if (layerValues.length == 0) {
					layerValues.push(layerValue);
				} else {
					var lisaaUusi = true;

					// Käydään läpi tallessa olevat, korvataan jos löytyy
					for (var lvInd = 0; lvInd < layerValues.length; lvInd++) {
						if (layerValues[lvInd].nimi === editLayer.name) {
							// Arvo muutettu, poistetaan ja lisätään uusiksi
							layerValues.splice(lvInd, 1);
							layerValues.push(layerValue);
							lisaaUusi = false;
							break;
						}
					}
					// Lisätään
					if (lisaaUusi) {
						layerValues.push(layerValue);
					}
				}

				// Päivitetään säilytettävät arvot
				this.setUserMapLayerValues(layerValues);

				/*
				 * Set marker layer zIndex always higher than the others, otherwise it will stay at 0 --> stays under the layers with higher zIndex.
				 */
				for (var i = 0; i < layers.array_.length; i++) {
					if (layers.array_[i].values_.markers === true) {
						layers.array_[i].setZIndex(99);
					}
				}
			},
			setUserZoom: function (z) {
				userZoom = z;
			},
			getUserZoom: function () {
				return userZoom;
			},
			getDefaultLayer: function () {
				return defaultLayer;
			},
			setDefaultLayer: function (newDefault) {
				defaultLayer = newDefault;
			},
			map: function (mapLayers, center, zoom) {
				if (typeof center === "undefined") {
					center = {
						lon: CONFIG.DEFAULT_MAP_CENTER[1],
						lat: CONFIG.DEFAULT_MAP_CENTER[0],
						bounds: []
					}
				}
				if (zoom) {
					center.zoom = zoom;
				} else {
					center.zoom = 7;
				}
				center.projection = $rootScope.projection;

				return {
					offset: 0,
					layers: mapLayers,
					center: center,
					defaults: {
						interactions: {
							mouseWheelZoom: true
						},
						view: {
							zoom: 8,
							projection: $rootScope.projection
						},
						events: {
							map: [
								'singleclick', 'pointermove', 'zoomend'
							]
						},
						controls: {
							zoom: true,
							fullscreen: true,
							attribution: false
						}
					},
					controls: [
						{ name: 'zoom', active: true },
						{ name: 'fullscreen', active: true },
						{ name: 'attribution', active: 'false' },
						{ name: 'zoomslider', active: true },
						{ name: 'scaleline', active: true },
						{ name: 'mouseposition', active: true },
						{ name: 'overviewmap', active: false }
					],
					markers: []
				}
			},
			nukeLayer: function (mapLayers, layerName) {
				var toNuke = [];

				for (var i = 0; i < mapLayers.length; i++) {
					var mapLayer = mapLayers[i];

					if (mapLayer.name == layerName) {
						toNuke.push(mapLayer);
						break;
					}
				}

				for (var i = 0; i < toNuke.length; i++) {
					mapLayers.splice(mapLayers.indexOf(toNuke[i]), 1);
				}
			},
			nukeLayers: function (mapLayers) {
				var toNuke = [];

				for (var i = 0; i < mapLayers.length; i++) {
					var mapLayer = mapLayers[i];

					if (mapLayer.name.indexOf("POHJAKARTTA_") > -1) {
						continue; // we won't want to nuke a base
						// map
					} else {
						// mapLayers.splice(i, 1);
						toNuke.push(mapLayer);
					}
				}

				for (var i = 0; i < toNuke.length; i++) {
					mapLayers.splice(mapLayers.indexOf(toNuke[i]), 1);
				}
			},
			selectLayer: function (mapLayers, selectedLayers, searchObj, emptyLayer, paginators, rebuildPaginators) {
				if (typeof emptyLayer === 'undefined') {
					emptyLayer = false;
				}

				if (typeof paginators === 'undefined') {
					paginators = [];
				}

				if (typeof rebuildPaginators === 'undefined') {
					rebuildPaginators = true;
				}

				// Käyttäjän tallentamat karttatasojen järjestykset ja läpinäkyvyys arvot
				var savedMapLayers = this.getUserMapLayerValues();

				if (savedMapLayers.length > 0) {
					for (var mi = 0; mi < mapLayers.length; mi++) {
						var mLayer = mapLayers[mi];

						for (var smi = 0; smi < savedMapLayers.length; smi++) {
							var savedLayer = savedMapLayers[smi];
							if (savedLayer.nimi == mLayer.name) {
								mapLayers[mi].zIndex = savedLayer.zIndex;
								mapLayers[mi].opacity = savedLayer.opacity;
								break;
							}
						}
					}
				}


				// step 1: toggle active flag on already existing map
				// layers
				for (var i = 0; i < mapLayers.length; i++) {
					var mapLayer = mapLayers[i];

					if (mapLayer.name.indexOf("POHJAKARTTA_") > -1) {
						continue; // we won't want to hide the base
						// map
					}

					var shouldBeActive = false;

					for (var j = 0; j < selectedLayers.length; j++) {
						var selectedLayer = selectedLayers[j];

						if (selectedLayer == mapLayer.name) {
							shouldBeActive = true;
							break;
						}
					}

					mapLayer.active = shouldBeActive;
				}

				// step 2: check if we need to load map layers
				for (var j = 0; j < selectedLayers.length; j++) {
					var selectedLayer = selectedLayers[j];

					var alreadyExists = false;

					for (var i = 0; i < mapLayers.length; i++) {
						var mapLayer = mapLayers[i];

						if (mapLayer.name == selectedLayer) {

							alreadyExists = true;
							break;
						}
					}

					if (!alreadyExists) {
						if (emptyLayer) {
							// hack together an empty layer
							mapServiceFunctions.emptyLayer(mapLayers, selectedLayer);
						} else if (selectedLayer == 'Kiinteistot') {
							/*
							 * note: this is the VALUE in $scope.objectLayers
							 */
							if (paginators.length > 0) {
								// we boldly assume that the first paginator
								// relates to kiinteisto entities
								mapServiceFunctions.showKiinteistot(mapLayers, searchObj, paginators[0], rebuildPaginators);
							} else {
								mapServiceFunctions.showKiinteistot(mapLayers, searchObj);
							}
						} else if (selectedLayer == 'Rakennukset') {
							//US#7232 Poistetaan inventoija hakuehdoista - "rakennuksella ei ole inventoijaa" ja inventoijan mukaan ei rakennuksia filtteröidä
							var rakennusSearchObj = angular.copy(searchObj);
							if (rakennusSearchObj['inventoija']) {
								delete rakennusSearchObj['inventoija'];
							}
							// we boldly assume that the second paginator
							// relates to rakennus entities
							if (paginators.length > 1) {
								mapServiceFunctions.showRakennukset(mapLayers, rakennusSearchObj, paginators[1], rebuildPaginators);
							} else {
								mapServiceFunctions.showRakennukset(mapLayers, rakennusSearchObj);
							}
						} else if (selectedLayer == 'Alueet') {
							// the third paginator is the alue paginator
							if (paginators.length > 2) {
								mapServiceFunctions.showAlueet(mapLayers, searchObj, paginators[2], rebuildPaginators);
							} else {
								mapServiceFunctions.showAlueet(mapLayers, searchObj);
							}
						} else if (selectedLayer == 'Arvoalueet') {
							// the fourth paginator is for arvoalue
							if (paginators.length > 3) {
								mapServiceFunctions.showArvoalueet(mapLayers, searchObj, paginators[3], rebuildPaginators);
							} else {
								mapServiceFunctions.showArvoalueet(mapLayers, searchObj);
							}
						} else if (selectedLayer == 'Porrashuoneet') {
							mapServiceFunctions.showPorrashuoneet(mapLayers, searchObj);
						} else if (selectedLayer == 'Projektit') {
							mapServiceFunctions.showProjektit(mapLayers, searchObj);
						} else if (selectedLayer == 'Kohteet') {
							// the fifth paginator is for kohteet
							if(paginators.length > 4) {
								mapServiceFunctions.showKohteet(mapLayers, searchObj, paginators[4], rebuildPaginators);
							} else {
								mapServiceFunctions.showKohteet(mapLayers, searchObj);
							}
						} else if (selectedLayer == 'Yksikot') {
							mapServiceFunctions.showYksikot(mapLayers, searchObj);
						} else if (selectedLayer == 'Tutkimusalueet') {
							if (paginators.length > 5) {
								mapServiceFunctions.showTutkimusalueet(mapLayers, searchObj, paginators[5], rebuildPaginators);
							} else {
								mapServiceFunctions.showTutkimusalueet(mapLayers, searchObj);
							}
						} else {
							if (CONFIG.DEBUG) {
								console.log(selectedLayer + " -- don't know how to show this yet!");
							}
						}
					}
				}

				return selectedLayers;
			},
			maastokarttaLayer: function () {
				return {
					name: 'POHJAKARTTA_Maastokartta',
					active: true,
					source: {
						type: 'ImageWMS',
						url: '<geoserver_mml_proxy_url>',
						params: {
							'REQUEST': 'GetMap',
							'FORMAT': 'image/png',
							'VERSION': '1.1.1',
							'LAYERS': 'maastokartta',
						},
						serverType: ('geoserver'),
						ratio: 1
					}
				}
			},
			kiinteistorajatLayer: function () {
				return {
					name: 'POHJAKARTTA_Kiinteistörajat',
					active: true,
					source: {
						type: 'ImageWMS',
						url: '<geoserver_mml_proxy_url>',
						params: {
							'REQUEST': 'GetMap',
							'FORMAT': 'image/png',
							'VERSION': '1.1.1',
							'LAYERS': 'ktj_kiinteistorajat',
						},
						serverType: ('geoserver'),
						ratio: 1
					}
				}
			},
			kiinteistotunnuksetLayer: function () {
				return {
					name: 'POHJAKARTTA_Kiinteistunnukset',
					active: true,
					source: {
						type: 'ImageWMS',
						url: '<geoserver_mml_proxy_url>',
						params: {
							'REQUEST': 'GetMap',
							'FORMAT': 'image/png',
							'VERSION': '1.1.1',
							'LAYERS': 'ktj_kiinteistotunnukset',
						},
						serverType: ('geoserver'),
						ratio: 1
					}
				}
			},
			peruskarttaLayer: function () {
				return {
					name: 'POHJAKARTTA_Peruskartta',
					active: true,
					source: {
						type: 'ImageWMS',
						url: '<geoserver_mml_proxy_url>',
						params: {
							'REQUEST': 'GetMap',
							'FORMAT': 'image/png',
							'VERSION': '1.1.1',
							'LAYERS': 'peruskartta',
						},
						serverType: ('geoserver'),
						ratio: 1
					}
				}
			},
			selectBaseLayer: function (mapLayers, selectedLayers) {
				// step 1: toggle active flag on already existing map
				// layers

				for (var i = mapLayers.length - 1; i >= 0; i--) {
					var mapLayer = mapLayers[i];

					//MUUTOS ARK-OSION MUKANA:
					//Enää ei säädetä tason aktiivisuutta, vaan poistetaan taso
					//kokonaan valituista. Tämä helpottaa tasojen käsittelyä
					//ja järjestys menee aina kerralla oikein.
					if (mapLayer.name.indexOf("POHJAKARTTA_") == -1) {
						continue; // we only care about base maps here
					} else {
						mapLayers.splice(i, 1);
					}

					/*
											var shouldBeActive = false;

											for(var j = 0; j < selectedLayers.length; j++) {
												var selectedLayer = selectedLayers[j];

												if('POHJAKARTTA_' + selectedLayer.nimi == mapLayer.name) {
													shouldBeActive = true;
													break;
												}
											}

											mapLayer.active = shouldBeActive;
											*/
				}



				// step 2: check if we need to load map layers
				for (var j = 0; j < selectedLayers.length; j++) {
					var selectedLayer = selectedLayers[j];

					var alreadyExists = false;

					for (var i = 0; i < mapLayers.length; i++) {
						var mapLayer = mapLayers[i];

						if (mapLayer.name == 'POHJAKARTTA_' + selectedLayer.nimi) {
							alreadyExists = true;
							break;
						}
					}

					if (!alreadyExists) {
						var url = selectedLayer.url;

						// The url is in an array or something and contains { as the first char and } as the last char.
						// Strip those off
						if (url.indexOf('{') == 0) {
							url = selectedLayer.url.substring(1);
							url = url.substring(0, url.length - 1);
						}
						// Kiinteistörajat url needs to have /image in it
						if (selectedLayer.taso == 'ktj_kiinteistorajat' || selectedLayer.taso == 'ktj_kiinteistotunnukset') {
							url = url + '/image';
						}

						/*
						* Erillinen käsitteli WMTS kartoille, NBA kartoille ja WMS kartoille.
						* Maanmittauslaitoksen kartoista Ortokuva tukee ainoastaan JPEG formaattia
						*/
						if (selectedLayer.tyyppi == 'WMTS' && selectedLayer.nimi == 'Ortokuva') {
							mapLayers.push({
								name: 'POHJAKARTTA_' + selectedLayer.nimi,
								projection: $rootScope.projection,
								opacity: 1,
								zIndex: mapLayers.length,
								active: true,
								source: {
									type: 'WMTS',
									url: url,
									tileGrid: {
										origin: ol.extent.getTopLeft(projectionExtent),
										resolutions: resolutions,
										matrixIds: matrixIds
									},
									layer: selectedLayer.taso,
									matrixSet: 'ETRS-TM35FIN',
									style: 'default',
									format: 'image/jpeg',
									maxExtent: [
										20.68109268840616, 59.885095740202026, 23.992600340320255, 60.577471480174445
									]
								}
							});
						} else if (selectedLayer.tyyppi == 'WMTS') {
							mapLayers.push({
								name: 'POHJAKARTTA_' + selectedLayer.nimi,
								projection: $rootScope.projection,
								opacity: 1,
								zIndex: mapLayers.length,
								active: true,
								source: {
									type: 'WMTS',
									url: url,
									tileGrid: {
										origin: ol.extent.getTopLeft(projectionExtent),
										resolutions: resolutions,
										matrixIds: matrixIds
									},
									layer: selectedLayer.taso,
									matrixSet: 'ETRS-TM35FIN',
									style: 'default',
									format: 'image/png',
									maxExtent: [
										20.68109268840616, 59.885095740202026, 23.992600340320255, 60.577471480174445
									]
								}
							});
						} else if (selectedLayer.url.indexOf('kartta.nba.fi') > -1) { //Museoviraston osoite. TODO: Tehdään järkevämpi toteutus paremmalla ajalla.
							mapLayers.push({
								name: 'POHJAKARTTA_' + selectedLayer.nimi,
								active: true,
								opacity: 1,
								zIndex: mapLayers.length,
								active: true,
								source: {
									type: 'ImageWMS',
									url: url,
									params: {
										'REQUEST': 'GetMap',
										'FORMAT': 'image/png',
										'VERSION': '1.3.0',
										'LAYERS': selectedLayer.taso,
										'TRANSPARENT': true,
										'f': 'image',
										'STYLES': 'default',
										'size': "1811,500" // TODO: how to get this to change according to the viewport size??
									},
									serverType: ('geoserver'),
									ratio: 1,
									crossOrigin: null,
									isBaseLayer: false,
									transitionEffect: 'resize',
									zoomOffset: 0
								}
							});
						} else if (selectedLayer.tyyppi == 'WMS') {
							mapLayers.push({
								name: 'POHJAKARTTA_' + selectedLayer.nimi,
								active: true,
								opacity: 1,
								zIndex: mapLayers.length,
								active: true,
								source: {
									type: 'TileWMS',
									url: url,
									params: {
										'REQUEST': 'GetMap',
										'FORMAT': 'image/png',
										'VERSION': '1.1.1',
										'LAYERS': selectedLayer.taso,
										'TRANSPARENT': true
									},
									serverType: ('geoserver'),
									ratio: 1,
									crossOrigin: null,
									isBaseLayer: true,
									transitionEffect: 'resize',
									zoomOffset: 0
								}
							});
						}
					}
				}

				// Käyttäjän tallentamat karttatasojen järjestykset ja läpinäkyvyys arvot
				var savedMapLayers = this.getUserMapLayerValues();

				if (savedMapLayers.length > 0) {
					for (var mi = 0; mi < mapLayers.length; mi++) {
						var mLayer = mapLayers[mi];

						for (var smi = 0; smi < savedMapLayers.length; smi++) {
							var savedLayer = savedMapLayers[smi];
							if (savedLayer.nimi == mLayer.name) {
								mapLayers[mi].zIndex = savedLayer.zIndex;
								mapLayers[mi].opacity = savedLayer.opacity;
								break;
							}
						}
					}
				}

				return selectedLayers;
			},
			showKiinteistot: function (mapLayers, searchObj, paginator, rebuildPaginator) {
				if (typeof paginator === 'undefined') {
					paginator = null;
				}

				if (typeof rebuildPaginator === 'undefined') {
					rebuildPaginator = true;
				}

				var usedSearchObj = searchObj;

				if (typeof searchObj['_kiinteisto_rivi'] !== 'undefined') {
					usedSearchObj = angular.copy(searchObj);
					usedSearchObj['rivi'] = usedSearchObj['_kiinteisto_rivi'];
					delete usedSearchObj['_kiinteisto_rivi'];
					delete usedSearchObj['_rakennus_rivi'];
					delete usedSearchObj['_alue_rivi'];
					delete usedSearchObj['_arvoalue_rivi'];
					delete usedSearchObj['_kohde_rivi'];
					delete usedSearchObj['_tutkimus_rivi'];

					// Change the kiinteistoNimi to nimi
					if (usedSearchObj['kiinteistoNimi']) {
						usedSearchObj['nimi'] = usedSearchObj['kiinteistoNimi'];
						delete usedSearchObj['kiinteistoNimi'];
					}
					/*
											 * TODO: Remove the search parameters we do not want to use with kiinteisto!
											 */

					// TODO deleting it here won't of course prevent it from
					// leaking into other queries (e.g. rakennukset)
				}

				var layer = {
					name: 'Kiinteistot',
					active: false,
					style: mapServiceFunctions.kiinteistoStyle,
					zIndex: 300,
					opacity: 1
				};

				mapLayers.push(layer);

				var kiinteistoPromise = KiinteistoService.getKiinteistot(usedSearchObj);

				kiinteistoPromise.then(function (kiinteistot) {

					// If kiinteistot.length == 0, tee uusi haku ilman bounding boxia
					if (kiinteistot.features.length == 0) {
						delete usedSearchObj['aluerajaus'];
						var kiinteistoPromise = KiinteistoService.getKiinteistot(usedSearchObj);

						kiinteistoPromise.then(function (kiinteistot) {

							mapServiceFunctions.setLayerData(mapLayers, layer, kiinteistot, searchObj, true, paginator, rebuildPaginator);
						});
					} else {
						mapServiceFunctions.setLayerData(mapLayers, layer, kiinteistot, searchObj, false, paginator, rebuildPaginator);
					}
				});
				return mapLayers;
			},
			setLayerData: function (mapLayers, layer, data, searchObj, doCenter, paginator, rebuildPaginator) {

				// Source needs to be set here. If we set source.geojson with object : [] we may get assertion error grom ol in the initial layer select.
				layer.source = {
					type: 'GeoJSON',
					geojson: {
						type: 'FeatureCollection',
						object: data,
						projection: 'EPSG:4326'
					}
				};

				layer.active = true;

				// rebuild paginator if necessary.
				if (paginator != null && rebuildPaginator) {
					var pageLength = parseInt(searchObj.rivit);
					var totalCount = parseInt(data.total_count);
					var curCount = parseInt(data.count);

					// Broadcast the total count
					$rootScope.$broadcast("Map_totalcount_updated", {
						type: layer.name,
						count: totalCount
					});

					if (centerToObject != null) {
						if (centerToObject.type === 'aluerajaus') {
							if (!angular.isArray(centerToObject.value)) {
								//We need to convert the coordinate string to array + change the projection from 4326 to 3067
								var coords = centerToObject.value.split(',');
								var convertedCoords = [];
								for (var i = 0; i < coords.length; i++) {
									var c = coords[i].split(" ");
									convertedCoords.push(mapServiceFunctions.epsg4326ToEpsg3067(c[0], c[1]));
								}

								var ext = [];
								ext[0] = convertedCoords[0][0];
								ext[1] = convertedCoords[0][1];
								ext[2] = convertedCoords[1][0];
								ext[3] = convertedCoords[1][1];

							}

							if (ext[0] < 26624 || ext[1] < 6590464 || ext[2] > 768000 || ext[3] > 7794688) {
								ext = [26624, 6590464, 768000, 7794688];
								locale.ready('error').then(function () {
									AlertService.showWarning(locale.getString("error.Invalid_coordinates"), locale.getString('error.Cannot_set_extent_properly'));
								});
							}

							ListService.setProp('aluerajaus', '');
							centerToObject = null;

							$rootScope.$broadcast("Center_map_to", {
								extent: ext,
								coordinates: centerTo,
								layer: layer.name
							});
						} else if (centerToObject.type === 'polygonrajaus') {
							if (!angular.isArray(centerToObject.value)) {

								//We need to convert the coordinate string to array + change the projection from 4326 to 3067
								var coords = centerToObject.value.coordinates[0];

								var ext = mapServiceFunctions.getExtentOfPolygon(coords);



								if (ext[0] < 26624 || ext[1] < 6590464 || ext[2] > 768000 || ext[3] > 7794688) {
									ext = [26624, 6590464, 768000, 7794688];
									locale.ready('error').then(function () {
										AlertService.showWarning(locale.getString("error.Invalid_coordinates"), locale.getString('error.Cannot_set_extent_properly'));
									});
								}

								centerToObject = null;

								$rootScope.$broadcast("Center_map_to", {
									extent: ext,
									coordinates: centerTo,
									layer: layer.name
								});
							}
						}
					} else if (doCenter == true && needToCenter == true) {


						var centerTo = null;

						// if(searchObj.inventointiprojektiId != null || searchObj.inventoija != null) {
						// Set the center. We currently do not have any better way to do this.
						//If the extent has not been set OR the new extent is bigger than the earlier extent, center to the new extent.
						var newExtent = mapServiceFunctions.calculateExtentOfFeatures(data.features);

						var oldExtent = angular.copy(extent);
						extent = mapServiceFunctions.getBiggestExtent(extent, newExtent);

						//Kommentoitu pois koodinpätkä, jonka avulla keskitetään ainoastaan yhteen pisteeseen, sen sijaan että
						//näytetään kaikki kartalla kerrallaan.
						/*
						} else {
								// Get the first objects with coordinates and center there
								for(var i = 0; i<data.features.length; i++) {
										if(data.features[i].geometry && data.features[i].geometry.coordinates) {
												if(data.features[i].geometry.type =='Point') {
														centerTo = data.features[i].geometry.coordinates;
														break;
												} else if(data.features[i].geometry.type =='Polygon') {
														var approxCenter = mapServiceFunctions.approximatePolygonCenter(data.features[i].geometry);
														var lon = approxCenter[0];
														var lat = approxCenter[1];

														centerTo = [lon, lat];
														break;
												}
										}
								}
						}
						*/
						if (centerTo != null || extent != null) {
							// Center the map
							$rootScope.$broadcast("Center_map_to", {
								extent: extent,
								coordinates: centerTo,
								layer: layer.name
							});
						}
						needToCenter = false;
						extent = null;
					}
					mapServiceFunctions.buildPaginator(paginator, rebuildPaginator, pageLength, totalCount, curCount);
				}
			},
			getExtentOfPolygon: function (polygon) {
				var minX, minY, maxX, maxY;

				for (var i = 0; i < polygon.length; i++) {
					var currentCoords = polygon[i];

					if (minX === undefined && minY === undefined && maxX === undefined && maxY === undefined) {
						minX = currentCoords[0];
						minY = currentCoords[1];
						maxX = currentCoords[0];
						maxY = currentCoords[1];
					}

					for (var j = 0; j < polygon.length; j++) {
						if (polygon[j][0] <= minX) {
							minX = polygon[j][0];
						}
						if (polygon[j][1] <= minY) {
							minY = polygon[j][1];
						}
						if (polygon[j][0] >= maxX) {
							maxX = polygon[j][0];
						}
						if (polygon[j][1] >= maxY) {
							maxY = polygon[j][1];
						}
					}
				}
				return [minX, minY, maxX, maxY];
			},
			buildPaginator: function (paginator, buildPaginator, pageLength, totalCount, curCount) {
				// TODO this is the wrong service for this, this has nothing
				// to do with maps per se
				if (typeof paginator === 'undefined' || paginator == null) {
					return;
				}

				if (typeof buildPaginator === 'undefined') {
					buildPaginator = true;
				}

				if (!buildPaginator) {
					return;
				}

				var totalPages = Math.ceil(totalCount / pageLength);

				paginator.length = 0;

				paginator.push({
					'id': 1,
					'rivi': 0,
					'active': true
				});

				for (var p = 2; p <= totalPages; p++) {
					paginator.push({
						'id': p,
						'rivi': (p - 1) * pageLength,
						'active': false
					});
				}
			},
			showRakennukset: function (mapLayers, searchObj, paginator, rebuildPaginator) {
				if (typeof paginator === 'undefined') {
					paginator = null;
				}
				if (typeof rebuildPaginator === 'undefined') {
					rebuildPaginator = true;
				}
				var usedSearchObj = searchObj;

				if (typeof searchObj['_rakennus_rivi'] !== 'undefined') {
					usedSearchObj = angular.copy(searchObj);
					usedSearchObj['rivi'] = usedSearchObj['_rakennus_rivi'];
					delete usedSearchObj['_rakennus_rivi'];
					delete usedSearchObj['_kiinteisto_rivi'];
					delete usedSearchObj['_alue_rivi'];
					delete usedSearchObj['_arvoalue_rivi'];
					delete usedSearchObj['_kohde_rivi'];


					// Change the kiinteistoNimi to nimi
					if (usedSearchObj['kiinteistoNimi']) {
						usedSearchObj['kiinteisto_nimi'] = usedSearchObj['kiinteistoNimi'];
						delete usedSearchObj['kiinteistoNimi'];
					}
					//Change the osoite to rakennus_osoite
					if (usedSearchObj['osoite']) {
						usedSearchObj['rakennus_osoite'] = usedSearchObj['osoite'];
						delete usedSearchObj['osoite'];
					}
				}

				var layer = {
					name: 'Rakennukset',
					active: false,
					style: mapServiceFunctions.rakennusStyle,
					zIndex: 400,
					opacity: 1
				};
				mapLayers.push(layer);

				var rakennusPromise = RakennusService.getRakennukset(usedSearchObj);

				rakennusPromise.then(function (rakennukset) {

					// Jos rakennuksia ei löytynyt, tee uusi haku ilman bounding boxia
					if (rakennukset.features.length == 0) {
						delete usedSearchObj['aluerajaus'];

						var rakennusPromise = RakennusService.getRakennukset(usedSearchObj);

						rakennusPromise.then(function (rakennukset) {
							mapServiceFunctions.setLayerData(mapLayers, layer, rakennukset, searchObj, true, paginator, rebuildPaginator);
						});
					} else {
						mapServiceFunctions.setLayerData(mapLayers, layer, rakennukset, searchObj, false, paginator, rebuildPaginator);
					}
				});
				return mapLayers;
			},
			showAlueet: function (mapLayers, searchObj, paginator, rebuildPaginator) {
				if (typeof paginator === 'undefined') {
					paginator = null;
				}
				if (typeof rebuildPaginator === 'undefined') {
					rebuildPaginator = true;
				}
				var usedSearchObj = searchObj;

				if (typeof searchObj['_alue_rivi'] !== 'undefined') {
					usedSearchObj = angular.copy(searchObj);
					usedSearchObj['rivi'] = usedSearchObj['_alue_rivi'];
					delete usedSearchObj['_rakennus_rivi'];
					delete usedSearchObj['_kiinteisto_rivi'];
					delete usedSearchObj['_alue_rivi'];
					delete usedSearchObj['_arvoalue_rivi'];
					delete usedSearchObj['_kohde_rivi'];

					// Change the alueNimi to nimi
					if (usedSearchObj['alueNimi']) {
						usedSearchObj['nimi'] = usedSearchObj['alueNimi'];
						delete usedSearchObj['alueNimi'];
					}
				}

				var layer = {
					name: 'Alueet',
					active: false,
					style: mapServiceFunctions.alueStyle,
					zIndex: 100
				};

				mapLayers.push(layer);

				var aluePromise = AlueService.getAlueet(usedSearchObj);
				aluePromise.then(function (alueet) {
					// Jos ei alueita, tee uusi haku ilman aluerajausta, jotta voidaan keskittää hakutuloksiin.
					if (alueet.features.length == 0) {
						delete usedSearchObj['aluerajaus'];

						var aluePromise = AlueService.getAlueet(usedSearchObj);

						aluePromise.then(function (alueet) {
							mapServiceFunctions.setLayerData(mapLayers, layer, alueet, searchObj, true, paginator, rebuildPaginator)
						});
					} else {
						mapServiceFunctions.setLayerData(mapLayers, layer, alueet, searchObj, true, paginator, rebuildPaginator)
					}
				});
				return mapLayers;
			},
			showArvoalueet: function (mapLayers, searchObj, paginator, rebuildPaginator) {
				if (typeof paginator === 'undefined') {
					paginator = null;
				}
				if (typeof rebuildPaginator === 'undefined') {
					rebuildPaginator = true;
				}
				var usedSearchObj = searchObj;

				if (typeof searchObj['_arvoalue_rivi'] !== 'undefined') {
					usedSearchObj = angular.copy(searchObj);
					usedSearchObj['rivi'] = usedSearchObj['_arvoalue_rivi'];
					delete usedSearchObj['_rakennus_rivi'];
					delete usedSearchObj['_kiinteisto_rivi'];
					delete usedSearchObj['_alue_rivi'];
					delete usedSearchObj['_arvoalue_rivi'];
					delete usedSearchObj['_kohde_rivi'];

					// Change the alueNimi to nimi
					if (usedSearchObj['alueNimi']) {
						usedSearchObj['alue_nimi'] = usedSearchObj['alueNimi'];
						delete usedSearchObj['alueNimi'];
					}
					// Change the arvoalueNimi to nimi
					if (usedSearchObj['arvoalueNimi']) {
						usedSearchObj['nimi'] = usedSearchObj['arvoalueNimi'];
						delete usedSearchObj['arvoalueNimi'];
					}
				}

				var layer = {
					name: 'Arvoalueet',
					active: false,
					style: mapServiceFunctions.arvoalueStyle,
					zIndex: 200,
					opacity: 1
				};

				mapLayers.push(layer);

				var arvoaluePromise = ArvoalueService.getArvoalueet(usedSearchObj);
				arvoaluePromise.then(function (arvoalueet) {
					if (arvoalueet.features.length == 0) {
						delete usedSearchObj['aluerajaus'];

						var arvoaluePromise = ArvoalueService.getArvoalueet(usedSearchObj);

						arvoaluePromise.then(function (arvoalueet) {
							mapServiceFunctions.setLayerData(mapLayers, layer, arvoalueet, searchObj, true, paginator, rebuildPaginator);
						});
					} else {
						mapServiceFunctions.setLayerData(mapLayers, layer, arvoalueet, searchObj, true, paginator, rebuildPaginator);
					}
				});
				return mapLayers;
			},
			showPorrashuoneet: function (mapLayers, searchObj) {
				var layer = {
					name: 'Porrashuoneet',
					active: false,
					style: mapServiceFunctions.porrashuoneStyle,
					opacity: 1
				};
				mapLayers.push(layer);

				var porrashuonePromise = PorrashuoneService.getPorrashuoneet(searchObj);
				porrashuonePromise.then(function (porrashuoneet) {
					layer.source = {
						type: 'GeoJSON',
						geojson: {
							type: 'FeatureCollection',
							object: porrashuoneet,
							projection: 'EPSG:4326'
						}
					};
					layer.active = true;
				});
				return mapLayers;
			},
			showProjektit: function (mapLayers, searchObj) {
				var layer = {
					name: 'Projektit',
					active: false,
					style: mapServiceFunctions.projektiStyle,
					opacity: 1
				};
				mapLayers.push(layer);
				/*
				var projektiPromise = ProjektiService.getProjektit(searchObj);
				projektiPromise.then(function(projektit) {
					layer.source = {
						type : 'GeoJSON',
						geojson : {
							type : 'FeatureCollection',
							object : projektit,
							projection : 'EPSG:4326'
						}
					};
					layer.active = true;
				});
				*/
				return mapLayers;
			},
			showKohteet: function (mapLayers, searchObj, paginator, rebuildPaginator) {
				if (typeof paginator === 'undefined') {
					paginator = null;
				}
				if (typeof rebuildPaginator === 'undefined') {
					rebuildPaginator = true;
				}
				var usedSearchObj = searchObj;

				if (typeof searchObj['_kohde_rivi'] !== 'undefined') {
					usedSearchObj = angular.copy(searchObj);
					usedSearchObj['rivi'] = usedSearchObj['_kohde_rivi'];
					delete usedSearchObj['_rakennus_rivi'];
					delete usedSearchObj['_kiinteisto_rivi'];
					delete usedSearchObj['_alue_rivi'];
					delete usedSearchObj['_arvoalue_rivi'];
					delete usedSearchObj['_kohde_rivi'];

					// Change the kohdeNimi to nimi
					if (usedSearchObj['kohdeNimi']) {
						usedSearchObj['nimi'] = usedSearchObj['kohdeNimi'];
						delete usedSearchObj['kohdeNimi'];
					}
				}
				var layer = {
					name: 'Kohteet',
					active: false,
					style: mapServiceFunctions.kohdeStyle,
					opacity: 1,
					zIndex: 500,
				};
				mapLayers.push(layer);

				var kohdePromise = KohdeService.getKohteet(usedSearchObj);
				kohdePromise.then(function (kohteet) {
					if(kohteet.features.length == 0) {
						delete usedSearchObj['aluerajaus'];

						var kohdePromise = KohdeService.getKohteet(usedSearchObj);
						kohdePromise.then(function (kohteet) {

							var kohde_sijainnit = [];
							// Kohde sisältää sijainnit, joka sisältää kohteen sijainnit (n kpl)
							// eli kartalla näytetään itseasiassa kohde_sijannit
							// Samalla poistetaan duplikaatit (eli saman kohteen sijainteja ei useaan kertaan)
							for (var i = 0; i < kohteet.features.length; i++) {
								var tmpKohde = kohteet.features[i];
								if(tmpKohde.properties.sijainnit && tmpKohde.properties.sijainnit.length > 0) {
									var tmpKohdeSijainnit = tmpKohde.properties.sijainnit;
									for (var j = 0; j < tmpKohdeSijainnit.length; j++) {
										var indexOfKohdeSijainti = -1;
										for (var k = 0; k < kohde_sijainnit.length; k++) {
											if(kohde_sijainnit[k].id === tmpKohdeSijainnit[j].id) {
												indexOfKohdeSijainti = k;
												break;
											}
										}
										if(indexOfKohdeSijainti == -1) {
											kohde_sijainnit.push(tmpKohdeSijainnit[j]);
										}
									}
								}
							}

							var features = {features: kohde_sijainnit, type: "FeatureCollection", total_count: kohteet.total_count};
							mapServiceFunctions.setLayerData(mapLayers, layer, features, searchObj, true, paginator, rebuildPaginator);
						});
					} else {
						var kohde_sijainnit = [];
						// Kohde sisältää sijainnit, joka sisältää kohteen sijainnit (n kpl)
						// eli kartalla näytetään itseasiassa kohde_sijannit
						// Samalla poistetaan duplikaatit (eli saman kohteen sijainteja ei useaan kertaan)
						for (var i = 0; i < kohteet.features.length; i++) {
							var tmpKohde = kohteet.features[i];
							if(tmpKohde.properties.sijainnit && tmpKohde.properties.sijainnit.length > 0) {
								var tmpKohdeSijainnit = tmpKohde.properties.sijainnit;
								for (var j = 0; j < tmpKohdeSijainnit.length; j++) {
									var indexOfKohdeSijainti = -1;
									for (var k = 0; k < kohde_sijainnit.length; k++) {
										if(kohde_sijainnit[k].id === tmpKohdeSijainnit[j].id) {
											indexOfKohdeSijainti = k;
											break;
										}
									}
									if(indexOfKohdeSijainti == -1) {
										kohde_sijainnit.push(tmpKohdeSijainnit[j]);
									}
								}
							}
						}
						var features = {features: kohde_sijainnit, type: "FeatureCollection", total_count: kohteet.total_count};
						mapServiceFunctions.setLayerData(mapLayers, layer, features, searchObj, false, paginator, rebuildPaginator); // TODO: Onko false oikein?
					}
				});

				return mapLayers;
			},
			showAlakohteet: function (mapLayers, searchObj) {
				var layer = {
					name: 'Alakohteet',
					active: true,
					style: mapServiceFunctions.alakohdeStyle,
					opacity: 1,
					zIndex: 500,
					source: {
						type: 'GeoJSON',
						geojson: {
							type: 'FeatureCollection',
							object: { features: [] },
							projection: 'EPSG:4326'
						}
					}
				};
				mapLayers.push(layer);

				return mapLayers;
			},
			showReitit: function (mapLayers, searchObj) {
				var layer = {
					name: 'Reitit',
					active: true,
					style: mapServiceFunctions.reittiStyle,
					opacity: 1,
					zIndex: 500,
					source: {
						type: 'GeoJSON',
						geojson: {
							type: 'FeatureCollection',
							object: { features: [] },
							projection: 'EPSG:4326'
						}
					}
				};
				mapLayers.push(layer);

				return mapLayers;
			},
			showTutkimusalueet: function (mapLayers, searchObj, paginator, rebuildPaginator) {

				var layer = {
					name: 'Tutkimusalueet',
					active: true,
					style: mapServiceFunctions.tutkimusalueStyle,
					opacity: 1,
					zIndex: 500,
				};

				mapLayers.push(layer);

				if (typeof paginator === 'undefined') {
					paginator = null;
				}
				if (typeof rebuildPaginator === 'undefined') {
					rebuildPaginator = true;
				}
				var usedSearchObj = searchObj;

				if (typeof searchObj['_tutkimus_rivi'] !== 'undefined') {
					usedSearchObj = angular.copy(searchObj);
					usedSearchObj['rivi'] = usedSearchObj['_tutkimus_rivi'];
					delete usedSearchObj['_rakennus_rivi'];
					delete usedSearchObj['_kiinteisto_rivi'];
					delete usedSearchObj['_alue_rivi'];
					delete usedSearchObj['_arvoalue_rivi'];
					delete usedSearchObj['_kohde_rivi'];
					delete usedSearchObj['_tutkimus_rivi'];

					// Change the tutkimusNimi to nimi
					if (usedSearchObj['searchTutkimusNimi']) {
						usedSearchObj['tutkimuksen_nimi'] = usedSearchObj['searchTutkimusNimi'];
						delete usedSearchObj['searchTutkimusNimi'];
					}
				}

				usedSearchObj['showTutkimusalueFeatures'] = true;
				/*
				  OTETTU KOHTEILTA - WIP
				*/
				var tutkimusalueet = [];

				var tutkimusPromise = TutkimusService.haeTutkimukset(usedSearchObj);
				tutkimusPromise.then(function (tutkimukset) {
					if(tutkimukset.features.length == 0) {
						delete usedSearchObj['aluerajaus'];

						var tutkimusPromise = TutkimusService.haeTutkimukset(usedSearchObj);
						tutkimusPromise.then(function (tutkimukset) {
							// Tutkimus (ainoastaan ne joilla sijainteja) sisältää tutkimusalueet, joka sisältää tutkimusalueen sijainnin (1kpl / tutkimusalue, n tutkimusaluetta / tutkimus)
							// eli kartalla näytetään itseasiassa tutkimusalueet
							for (var i = 0; i < tutkimukset.features.length; i++) {
								for(var j = 0; j < tutkimukset.features[i].properties.tutkimusalueet.length; j++) {
									if(tutkimukset.features[i].properties.tutkimusalueet[j].geometry != null) {
										tutkimusalueet.push(tutkimukset.features[i].properties.tutkimusalueet[j]);
									}
								}
							}

							// Get correct count for unique tutkimukset, quick and dirty...
							var uniqueTutkimusIds = [];
							for(var n = 0; n < tutkimusalueet.length; n++) {
								var exists = false;
								var newId = tutkimusalueet[n].properties.ark_tutkimus_id;
								for(var m = 0; m < uniqueTutkimusIds.length; m++) {
									if(uniqueTutkimusIds[m] === newId) {
										exists = true;
										break;
									}
								}
								if(exists === false) {
									uniqueTutkimusIds.push(newId);
								}
							}

							var features = {features: tutkimusalueet, type: "FeatureCollection", total_count: uniqueTutkimusIds.length};
							mapServiceFunctions.setLayerData(mapLayers, layer, features, searchObj, true, paginator, rebuildPaginator);
						});
					} else {
						// Tutkimus sisältää tutkimusalueet, joka sisältää tutkimusalueen sijainnin (1kpl / tutkimusalue, n tutkimusaluetta / tutkimus)
						// eli kartalla näytetään itseasiassa tutkimusalueet
						for (var i = 0; i < tutkimukset.features.length; i++) {
							for(var j = 0; j < tutkimukset.features[i].properties.tutkimusalueet.length; j++) {
								if(tutkimukset.features[i].properties.tutkimusalueet[j].geometry != null) {
									tutkimusalueet.push(tutkimukset.features[i].properties.tutkimusalueet[j]);
								}
							}
						}

						// Get correct count for unique tutkimukset, quick and dirty...
						var uniqueTutkimusIds = [];
						for(var n = 0; n < tutkimusalueet.length; n++) {
							var exists = false;
							var newId = tutkimusalueet[n].properties.ark_tutkimus_id;
							for(var m = 0; m < uniqueTutkimusIds.length; m++) {
								if(uniqueTutkimusIds[m] === newId) {
									exists = true;
									break;
								}
							}
							if(exists === false) {
								uniqueTutkimusIds.push(newId);
							}
						}

						var features = {features: tutkimusalueet, type: "FeatureCollection", total_count: uniqueTutkimusIds.length};
						mapServiceFunctions.setLayerData(mapLayers, layer, features, searchObj, false, paginator, rebuildPaginator);
					}
				});
				/*
				  OTETTU KOHTEILTA END - WIP
				*/
				return mapLayers;
			},
			showYksikot: function (mapLayers, searchObj) {
				var layer = {
					name: 'Yksikot',
					active: false,
					style: mapServiceFunctions.yksikkoStyle,
					opacity: 1
				};
				mapLayers.push(layer);

				var yksikkoPromise = YksikkoService.getYksikot(searchObj);
				yksikkoPromise.then(function (yksikot) {
					layer.source = {
						type: 'GeoJSON',
						geojson: {
							type: 'FeatureCollection',
							object: yksikot,
							projection: 'EPSG:4326'
						}
					};
					layer.active = true;
				});
				return mapLayers;
			},
			/*
			* Returns a layer with an empty FeatureCollection. The layer's style is deduced from its name.
			*/
			emptyLayer: function (mapLayers, name) {
				var style = null;
				var zInd = 0;

				if (name == 'Kiinteistot') {
					style = mapServiceFunctions.kiinteistoStyle;
					zInd = mapServiceFunctions.getZIndex('kiinteisto');
				} else if (name == 'Rakennukset') {
					style = mapServiceFunctions.rakennusStyle;
					zInd = mapServiceFunctions.getZIndex('rakennus');
				} else if (name == 'Alueet') {
					style = mapServiceFunctions.alueStyle;
					zInd = mapServiceFunctions.getZIndex('alue');
				} else if (name == 'Arvoalueet') {
					style = mapServiceFunctions.arvoalueStyle;
					zInd = mapServiceFunctions.getZIndex('arvoalue');
				} else if (name == 'Projektit') {
					style = mapServiceFunctions.projektiStyle;
					zInd = mapServiceFunctions.getZIndex('projekti');
				} else if (name == 'Kohteet') {
					style = mapServiceFunctions.kohdeStyle;
					zInd = mapServiceFunctions.getZIndex('kohde');
				} else if (name == 'Alakohteet') {
					style = mapServiceFunctions.alakohdeStyle;
					zInd = mapServiceFunctions.getZIndex('alakohde');
				} else if (name == 'Tutkimusalueet') {
					style = mapServiceFunctions.tutkimusalueStyle;
					zInd = mapServiceFunctions.getZIndex('tutkimusalue');
				} else if (name == 'Yksikot') {
					style = mapServiceFunctions.yksikkoStyle;
					zInd = mapServiceFunctions.getZIndex('yksikko');
				} else if (name == 'Reitit') {
					style = mapServiceFunctions.reittiStyle;
					zInd = mapServiceFunctions.getZIndex('reitti');
				}

				var layer = {
					name: name,
					active: true,
					style: style,
					zIndex: zInd,
					opacity: 1,
					source: {
						type: 'GeoJSON',
						geojson: {
							type: 'FeatureCollection',
							object: {
								features: [],
								type: 'FeatureCollection'
							},
							projection: 'EPSG:4326'
						}
					}
				};

				mapLayers.push(layer);

				return mapLayers;
			},
			// NOTE the mixed up lat / lon order
			epsg3067ToEpsg4326: function (coord1, coord2) {
				var lonlat = ol.proj.transform([coord1, coord2], 'EPSG:3067', 'EPSG:4326');
				return [lonlat[0], lonlat[1]];
			},
			// NOTE the mixed up lat / lon order
			epsg4326ToEpsg3067: function (coord1, coord2) {
				var lonlat = ol.proj.transform([coord1, coord2], 'EPSG:4326', 'EPSG:3067');
				return [lonlat[0], lonlat[1]];
			},
			approximatePolygonCenter: function (geometry) {
				if (!geometry.coordinates || !geometry.coordinates[0]) {
					throw "Geometry has no coordinates!";
				}

				if (!geometry.type) {
					throw "Geometry has no type!";
				}

				if (geometry.type != "Polygon") {
					throw "Unsupported geometry type -- polygons only";
				}

				var pairs = geometry.coordinates[0].length;
				var i = 0, lonSum = 0.0, latSum = 0.0;

				for (; i < (pairs - 1); i++) {
					lonSum += geometry.coordinates[0][i][0];
					latSum += geometry.coordinates[0][i][1];
				}

				var center = [(lonSum / i), (latSum / i)];

				return center;
			},
			polygonToString: function (geometry) {
				if (!geometry.coordinates || !geometry.coordinates[0]) {
					throw "Geometry has no coordinates!";
				}

				if (!geometry.type) {
					throw "Geometry has no type!";
				}

				if (geometry.type != "Polygon") {
					throw "Unsupported geometry type -- polygons only";
				}

				var pairs = geometry.coordinates[0].length;
				var str = "";

				for (var i = 0; i < pairs; i++) {
					if (i > 0) {
						str += ",";
					}

					str += geometry.coordinates[0][i][0] + " ";
					str += geometry.coordinates[0][i][1];
				}

				return str;
			},
			showMapPopup: function (elemId, data, featureHit, layerHit, modal) {
				var featureProperties = featureHit.getProperties();
				var text = featureProperties.id;

				//If we have a marker:
				if (featureProperties.marker !== undefined) {
					if (featureProperties.marker.$parent && featureProperties.marker.$parent.marker && featureProperties.marker.$parent.marker.label) {
						var text = featureProperties.marker.$parent.marker.label;
					}
				}

				if (layerHit == null) {
					return;
				}
				if (layerHit.getProperties().name == 'DrawingLayer') {
					//Ei näytetä popuppia piirtotasolle, piilotetaan mahdollisesti näkyvä popup.
					mapServiceFunctions.hideMapPopup(elemId);
					return;
				} else if (layerHit.getProperties().name == 'UserLocationLayer' || layerHit.getProperties().name == 'Reitit') {
					// Näytetään reitin tekijä ja pvm
					if(featureProperties.luoja) {
						text = featureProperties.luoja.sukunimi + ' ' + featureProperties.luoja.etunimi + ', ';
					}
					if(featureProperties.muokattu) {
						text += $filter('pvm')(featureProperties.muokattu, 'dd.MM.yyyy HH:mm');
					} else if(featureProperties.luotu) {
						text += $filter('pvm')(featureProperties.luotu, 'dd.MM.yyyy HH:mm');
					} else if(featureProperties.id) {
						locale.ready('map').then(function() {
							text = locale.getString('map.Route') + ' ' + featureProperties.id;
						});
					} else {
						locale.ready('map').then(function() {
							text = locale.getString('map.Route');
						});
					}
				} else if (layerHit.getProperties().name == 'Kiinteistot') {
					text = featureProperties.kiinteistotunnus;

					if (featureProperties.nimi && featureProperties.nimi.length > 0) {
						text += " " + featureProperties.nimi;
					}
				} else if (layerHit.getProperties().name == 'Rakennukset') {
					if (featureProperties.MMLFeatureIndex) {
						// We're handling an item fetched from the MML interface. Show different information on the popover
						text = featureProperties.rakennustunnus;
					} else if (elemId.indexOf('inventointiprojektiMapPopup') >= 0) {
						if (featureProperties.kiinteisto && featureProperties.kiinteisto.kiinteistotunnus.length > 0) {
							text = featureProperties.kiinteisto.kiinteistotunnus;
						} else if (featureProperties.kiinteistotunnus.length > 0) {
							text = featureProperties.kiinteistotunnus;
						}
						if (featureProperties.inventointinumero) {
							text += " - " + featureProperties.inventointinumero;
						}
						if (featureProperties.rakennustyypit && featureProperties.rakennustyypit.length > 0) {
							if (featureProperties.rakennustyypit[0].nimi_fi) {
								text = text + " " + featureProperties.rakennustyypit[0].nimi_fi
							}
						}

						if (featureProperties.purettu == true) {
							text += " (purettu)";
						}
					} else {
						// Regular case - show the information as usually.
						text = featureProperties.inventointinumero;

						if (featureProperties.kiinteisto) {
							text = featureProperties.kiinteisto.kiinteistotunnus + " " + text;
						}

						if (featureProperties.rakennustyypit && featureProperties.rakennustyypit.length > 0) {
							text = text + " " + featureProperties.rakennustyypit[0].nimi_fi
						}

						if (featureProperties.purettu == true) {
							text += " (purettu)";
						}
					}
				} else if (layerHit.getProperties().name == 'Alueet') {
					if (elemId.indexOf('inventointiprojektiMapPopup') >= 0) {
						if (featureProperties.nimi.length > 0) {
							text = featureProperties.nimi;
						}
					} else {
						if (featureProperties.nimi.length > 0) {
							text = featureProperties.nimi;
						}
					}
				} else if (layerHit.getProperties().name == 'Arvoalueet') {
					if (elemId.indexOf('inventointiprojektiMapPopup') >= 0) {
						// We show a bit different information when in the inventointiprojekti view
						//Nimi is not mandatory value -> check that it exists
						if (featureProperties.nimi && featureProperties.nimi.length > 0) {
							text = featureProperties.nimi + " ";
						} else {
							text = featureProperties.inventointinumero;
						}
					} else {
						if (featureProperties.nimi && featureProperties.nimi.length > 0) {
							text = featureProperties.nimi;
						} else {
							text = featureProperties.inventointinumero;
						}
					}
				} else if (layerHit.getProperties().name == 'Kohteet') {
					text = featureProperties.nimi;
					if (featureProperties.muinaisjaannostunnus) {
						text += " " + featureProperties.muinaisjaannostunnus;
					}
					if (featureProperties.tuhoutunut) {
						text += " - " + locale.getString('ark.Destroyed');
					}
				} else if (layerHit.getProperties().name == 'Tutkimusalueet') {
					// Näytetään tutkimuksen nimi ja alueen nimi
					if(featureProperties.tutkimus && featureProperties.tutkimus.nimi) {
						text = featureProperties.tutkimus.nimi;
					}
					if (featureProperties.nimi) {
						if(text.length > 0) {
							text += ', ' + featureProperties.nimi;
						} else {
							text = featureProperties.nimi;
						}
					}
				} else if (featureProperties.nimi) {//Geneerinen, näytetään ainoastaan nimi
					text = "" + featureProperties.nimi;
				} else if (featureProperties.name) {
					text = "" + featureProperties.name;
				} else if (featureProperties.label) {
					text = "" + featureProperties.label;
				}

				// TODO: Add above Projektit, Yksikot(?) and others if needed

				var doc = document.documentElement;

				var left = 0, top = 0;

				if (!modal) {
					left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
					top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
				}

				var x = data.event.originalEvent.clientX + left + 5;
				var y = data.event.originalEvent.clientY + top - 35;

				$("#" + elemId).removeClass().addClass("mapPopup-" + layerHit.getProperties().name).addClass("mapPopup");
				$("#" + elemId).css({ top: y, left: x, display: "block" });
				$("#" + elemId).html(text);
			},
			hideMapPopup: function (elemId) {
				$("#" + elemId).css("display", "none");
			},
			fetchEstateDetails: function (lon, lat) {

				var deferred = $q.defer(); // /ktj/kiinteisto/
				var url = CONFIG.API_URL + 'ktj/kiinteisto/' + '?sijainti=' + lon + ' ' + lat;
				$http({
					method: 'GET',
					url: url
				}).then(function successCallback(response) {
					deferred.resolve(response.data.data);
				}, function errorCallback(response) {
					deferred.reject(response);
				});

				return deferred.promise;
			},
			fetchBuildingDetails: function (kiinteistotunnus, sijainti) {

				var deferred = $q.defer(); // /ktj/kiinteisto/
				var url = CONFIG.API_URL + 'ktj/rakennus/' + '?kiinteistotunnus=' + kiinteistotunnus + '&sijainti=' + sijainti;
				$http({
					method: 'GET',
					url: url
				}).then(function successCallback(response) {
					deferred.resolve(response.data);
				}, function errorCallback(response) {
					deferred.reject(response);
				});

				return deferred.promise;
			},
			getAvailableMapLayers: function () {
				var deferred = $q.defer();
				var url = CONFIG.API_URL + "valinta/wms";
				$http({
					method: 'GET',
					url: url,
					cache: CacheFactory.get('mapCache')
				}).then(function success(response) {
					var ret = [];
					for (var i = 0; i < response.data.data.features.length; i++) {
						if (response.data.data.features[i].properties.kaytossa == true) {
							ret.push(response.data.data.features[i]);
						}
					}

					deferred.resolve(ret);
				}, function error(response) {
					deferred.reject(response);
				});
				return deferred.promise;
			},
			/*
			* Fix the ZIndexes of the layers. For some reason the original values get overridden after selecting and deselecting the layers.
			*/
			fixZIndexes: function (layersToFix) {
				var layers = layersToFix;
				for (var i = 0; i < layers.array_.length; i++) {
					var layer = layers.array_[i];
					if (layer.values_.name == 'Kiinteistot') {
						layer.setZIndex(300);
					} else if (layer.values_.name == 'Rakennukset') {
						layer.setZIndex(400);
					} else if (layer.values_.name == 'Alueet') {
						layer.setZIndex(100);
					} else if (layer.values_.name == 'Arvoalueet') {
						layer.setZIndex(200);
					} else if (layer.values_.name == 'Projektit') {
						layer.setZIndex(150);
					} else if (layer.values_.name == 'Kohteet') {
						layer.setZIndex(500);
					} else if (layer.values_.name == 'Tutkimusalueet') {
						layer.setZIndex(500);
					}
				}
			},
			/*
			* Geolocate address. - Enter a street name, street number, county name, county number and find the coordinates from the MML service. - MML URL: http://www.maanmittauslaitos.fi/kartat-ja-paikkatieto/asiantuntevalle-kayttajalle/kartta-ja-paikkatietojen-rajapintapalvelut-6
			*/
			getOsoiteDetails: function (osoite) {
				var deferred = $q.defer();
				var params = '';
				var katunimi, kuntanimi, kuntanumero;

				// After selecting the option the typeahead performs the search again.
				// We do not need to perform the search again, just return
				if (angular.isObject(osoite)) {
					deferred.resolve();
					return deferred.promise;
				}
				// Split the osoite to half ["katu", "kunta"]
				var addr = osoite.split(',');

				if (addr.length == 2) {
					// We have a street and county
					katunimi = addr[0];
					kuntanimi = addr[1].trim();
				} else {
					// We only have one value, that can be kadunnimi or kuntanumero
					katunimi = addr[0];

					// If the value is numeric and length is 3 --> we have county number istead of name
					if (katunimi.length == 3 && katunimi.match(/^\d+$/)) {
						kuntanumero = katunimi;
						katunimi = '';
					}
				}

				// If we first had 2 sections ["katu", "kunta"], our "kunta" can be county number
				// If the value is numeric and length is 3 --> we have a county number instead of name
				if (kuntanimi && kuntanimi.match(/^\d+$/) && kuntanimi.length == 3) {
					kuntanumero = kuntanimi;
					kuntanimi = '';
				}

				// Put the parameters to the url
				if (katunimi && katunimi.length > 0) {
					//Katunimi with spaces needs quotation marks around it
					var lastSpace = katunimi.lastIndexOf(" ");
					if (lastSpace > 0 && katunimi.substring(lastSpace).trim().match(/^\d+$/)){
						nimi = katunimi.slice(0, lastSpace);
						numero = katunimi.substring(lastSpace).trim();
						katunimi = '\"' +nimi +'\" ' +numero;
					}
					params = '?katunimi=' + katunimi;
				}

				if (kuntanimi && kuntanimi.length > 0) {
					if (params.length > 0) {
						params += '&kuntanimi=' + kuntanimi;
					} else {
						params = '?kuntanimi=' + kuntanimi;
					}
				}

				if (kuntanumero && kuntanumero.length > 0) {
					if (params.length > 0) {
						params += '&kuntanumero=' + kuntanumero;
					} else {
						params = '?kuntanumero=' + kuntanumero;
					}
				}

				// Finally perform the request
				var url = CONFIG.API_URL + 'ktj/osoite/' + params;
				$http({
					method: 'GET',
					url: url,
					cache: CacheFactory.get('mapCache')
				}).then(function successCallback(response) {
					deferred.resolve(response.data);
				}, function errorCallback(response) {
					deferred.reject(response);
				});

				return deferred.promise;
			},
			/*
			 * Geolocate place name - Enter a place name and find coordinates for it from the MML service. - MML URL: http://www.maanmittauslaitos.fi/kartat-ja-paikkatieto/asiantuntevalle-kayttajalle/kartta-ja-paikkatietojen-rajapintapalvelut-9
			 */
			getNimistoDetails: function (haku, kuntahaku) {

				var deferred = $q.defer();

				var paikannimi, kunta;

				// After selecting the option the typeahead performs the search again.
				// We do not need to perform the search again, just return
				if (angular.isObject(haku)) {
					deferred.resolve();
					return deferred.promise;
				}

				var paikka = haku.split(',');

				if (paikka.length = 2) {
					// We have paikannimi and kunta
					paikannimi = paikka[0];
					kunta = paikka[1];
				} else {
					// We have only paikannimi
					paikannimi = paikka[0];
				}

				// Do not even try to perform an empty search
				if (haku.length == 0) {
					deferred.resolve();
					return deferred.promise;
				}

				var params = '';

				params = '?paikannimi=' + paikannimi;

				if (kunta && kunta.length > 0) {
					params += '&kunta=' + kunta;
				}
				//JOS haetaan ainoastaan kuntia (keskittämistä varten)
				if (kuntahaku) {
					params += '&kuntahaku=true';//MML speksi hakutyypille kunta
				}

				var url = CONFIG.API_URL + 'ktj/nimisto/' + params;

				var request = $http({
					method: 'GET',
					url: url,
					cache: CacheFactory.get('mapCache')
				});

				var promise = request.then(function successCallback(response) {
					deferred.resolve(response.data);
				}, function errorCallback(response) {
					deferred.reject(response);
				});

				return deferred.promise;
			},
			getFeatureInfo: function (featureinfourl) {
				var deferred = $q.defer();

				// Finally perform the request
				var url = CONFIG.API_URL + 'kartta/getfeatureinfo';
				var params = { 'featureinfourl': featureinfourl };

				$http({
					method: 'GET',
					url: url,
					params: params,
					cache: CacheFactory.get('mapCache')
				}).then(function successCallback(response) {
					deferred.resolve(response.data);
				}, function errorCallback(response) {
					deferred.reject(response);
				});

				return deferred.promise;
			},
			/*
			 * Set or clear specific value from the geoserver layer viewparams.
			 * To clear a value do not provide paramValue at all.
			 */
			setViewParam: function (mapLayers, layerName, paramName, paramValue) {
				for (var i = 0; i < mapLayers.length; i++) {
					var l = mapLayers[i];
					if (l.name == layerName) {
						//Params contain e.g.: 'kunta_nimi:vehmaa;kyla_nimi:test;kyla_numero:049'
						//split using comma and set/delete the wanted parameter

						var existingParams = l.source.params['viewparams'];

						if (existingParams != undefined) {
							var existingParamsArray = existingParams.split(';');

							for (var j = existingParamsArray.length - 1; j >= 0; j--) {

								//delete the specific key:value pair
								//split using : to get the key
								var existingParamArray = existingParamsArray[j].split(':'); //[0] = paramName (e.g. kunta_nimi) and [1] = paramValue (e.g. Vehmaa)

								if (existingParamArray[0] == paramName) {
									existingParamsArray.splice(j, 1);
								}
							}
							existingParams = existingParamsArray.join(';');

							//If a new value was given, concatenate it to the existing viewparams string
							if (paramValue != undefined) {
								if (existingParams.length > 0) {
									existingParams = existingParams + ';' + paramName + ':' + paramValue;
								} else {
									existingParams = paramName + ':' + paramValue;
								}
							}

						} else if (paramName != undefined && paramValue != undefined) {
							existingParams = paramName + ':' + paramValue;
						}

						if (existingParams != undefined) {
							if (existingParams.length > 0) {
								l.source.params['viewparams'] = existingParams;
							} else {
								delete l.source.params['viewparams'];
							}
						}
						//console.log(l.source.params['viewparams']);
					}
				}
				return mapLayers;
			},
			calculateExtentOfFeatures: function (features) {
				/*
				 * Calculates the minX, minY, maxX and maxY of the given features.
				 * Transforms the resulting extent to the needed projection.
				 */
				var minX = null, minY = null, maxX = null, maxY = null;
				var orderedData = features;

				for (var i = 0; i < orderedData.length; i++) {
					var feature = orderedData[i];
					if (feature.geometry != null && feature.geometry.coordinates && feature.geometry.type == 'Point') {
						//Get min and max coordinates of point
						if (minX === null || feature.geometry.coordinates[0] < minX) {
							minX = feature.geometry.coordinates[0];
						}
						if (minY === null || feature.geometry.coordinates[1] < minY) {
							minY = feature.geometry.coordinates[1];
						}
						if (maxX === null || feature.geometry.coordinates[0] > maxX) {
							maxX = feature.geometry.coordinates[0];
						}
						if (maxY === null || feature.geometry.coordinates[1] > maxY) {
							maxY = feature.geometry.coordinates[1];
						}
					} else if (feature.geometry != null && feature.geometry.coordinates && feature.geometry.type == 'Polygon') {
						//Get min and max coordinates of polygon
						for (var j = 0; j < feature.geometry.coordinates[0].length; j++) {
							var coord = feature.geometry.coordinates[0][j];
							if (minX === null || coord[0] < minX) {
								minX = coord[0];
							}
							if (minY === null || coord[1] < minY) {
								minY = coord[1];
							}
							if (maxX === null || coord[0] > maxX) {
								maxX = coord[0];
							}
							if (maxY === null || coord[1] > maxY) {
								maxY = coord[1];
							}
						}
					}	else if (feature.geometry != null && feature.geometry.coordinates && feature.geometry.type == 'LineString') {
						//Get min and max coordinates of polygon
						for (var j = 0; j < feature.geometry.coordinates.length; j++) {
							var coord = feature.geometry.coordinates[j];
							if (minX === null || coord[0] < minX) {
								minX = coord[0];
							}
							if (minY === null || coord[1] < minY) {
								minY = coord[1];
							}
							if (maxX === null || coord[0] > maxX) {
								maxX = coord[0];
							}
							if (maxY === null || coord[1] > maxY) {
								maxY = coord[1];
							}
						}
					}
				}
				if (minX !== null && minY !== null && maxX !== null && maxY !== null) {
					var ext = ol.proj.transformExtent([minX, minY, maxX, maxY], 'EPSG:4326', 'EPSG:3067')
					return ext;
				} else {
					return null;
				}
			},
			centerToExtent: function (map, extent) {
				if (extent === null) {
					return map;
				}
				/*
				 * Centers the view to the given extent and zooms in so that the zoom level matches the extent bounding box.
				 * If the extent is a lot outside the Finnish borders, do not even try to set that as the extent as OL gets broken.
				 */

				if (!angular.isArray(extent)) {

					//We need to convert the coordinate string to array + change the projection from 4326 to 3067
					var coords = extent.split(',');
					var convertedCoords = [];
					for (var i = 0; i < coords.length; i++) {
						var c = coords[i].split(" ");
						convertedCoords.push(mapServiceFunctions.epsg4326ToEpsg3067(c[0], c[1]));
					}

					extent = [];
					extent[0] = convertedCoords[0][0];
					extent[1] = convertedCoords[0][1];
					extent[2] = convertedCoords[1][0];
					extent[3] = convertedCoords[1][1];

				}

				if (extent[0] < 26624 || extent[1] < 6590464 || extent[2] > 768000 || extent[3] > 7794688) {
					extent = [26624, 6590464, 768000, 7794688];
					locale.ready('error').then(function () {
						AlertService.showWarning(locale.getString("error.Invalid_coordinates"), locale.getString('error.Cannot_set_extent_properly'));
					});
				}
				map.getView().fit(extent, map.getSize());
				if (map.getView().getZoom() > 15) {
					map.getView().setZoom(15);
				}
				return map;
			},
			getBiggestExtent: function (extent1, extent2) {
				/*
				 * Compares two extents (bounding boxes) and merges the minimum and maximum values of those resulting into one big extent.
				 * lat
				 * |
				 * |        bb1                                   bb1+bb2
				 * |        ***********                           *****************
				 * |        *      **********bb2       ===>       *               *
				 * |        *      *  *     *          ===>       *               *
				 * |        ***********     *          ===>       *               *
				 * |               *        *                     *               *
				 * |               **********                     *****************
				 * |
				 * |
				 * |
				 * |____________________________________________
				 *                                              lon
				 *
				 */
				if (extent1 !== null && extent2 === null) {
					return extent1;
				}
				if (extent2 !== null && extent1 === null) {
					return extent2;
				}

				if (extent1 !== null && extent2 !== null) {
					if (extent2[0] < extent1[0]) {
						extent1[0] = extent2[0];
					}
					if (extent2[1] < extent1[1]) {
						extent1[1] = extent2[1];
					}
					if (extent2[2] > extent1[2]) {
						extent1[2] = extent2[2];
					}
					if (extent2[3] > extent1[3]) {
						extent1[3] = extent2[3];
					}
				}
				return extent1;
			},
			haeMuinaisjaannos: function (muinaisjaannostunnus) {

				var deferred = $q.defer();
				var url = CONFIG.API_URL + 'kyppi/haemuinaisjaannos/' + muinaisjaannostunnus;
				$http({
					method: 'GET',
					url: url
				}).then(function successCallback(response) {
					deferred.resolve(response.data);
				}, function errorCallback(response) {
					deferred.reject(response);
				});

				return deferred.promise;
			}
		}
		// Yhdistetään modaalit laajennus factorysta
		return angular.extend(mapServiceFunctions, FeatureStyleService);
		//return mapServiceFunctions;
	}
]);