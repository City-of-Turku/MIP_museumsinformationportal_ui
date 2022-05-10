/*
 * Löytö service
 */
angular.module('mip.loyto', []);

angular.module('mip.loyto').factory('LoytoService', [
	'$rootScope', '$http', '$q', 'CONFIG', '$location', 'AlertService', '$route', 'ListService', 'UserService', 'CacheFactory',
	function ($rootScope, $http, $q, CONFIG, $location, AlertService, $route, ListService, UserService, CacheFactory) {

		/**
		 * Löytö cache selaimeen
		 */
		CacheFactory('loytoCache', {
			maxAge: 10 * 60 * 1000, // Items added to this cache expire after 10 minutes
			cacheFlushInterval: 60 * 60 * 1000, // This cache will clear itself every hour
			deleteOnExpire: 'passive', // Cache will do nothing when an item expires. Expired items will remain in the cache until requested, at which point they are removed, and undefined is returned.
			capacity: 50
			// Maximum number of items a cache can hold. Adding more items than the capacity will cause the cache to operate like an LRU cache, removing the least recently used items to stay under capacity. Default: Number.MAX_VALUE.
		});

		return {
			/*
			 * Hae löydöt
			 */
			haeLoydot: function (params) {
				var queryString = ListService.parseQueryString(params);
				var deferred = $q.defer();
				var url = CONFIG.API_URL + 'loyto/' + queryString;
				$http({
					method: 'GET',
					url: url,
					cache: CacheFactory.get('loytoCache')
				}).then(function successCallback(response) {
					deferred.resolve(response.data.data);
				}, function errorCallback(response) {
					if (CONFIG.DEBUG) {
						console.log("loytoService - fail : " + response);
					}
					deferred.reject(response);
				});

				deferred.promise.cancel = function () {
					deferred.resolve('Cancelled');
				};

				return deferred.promise;
			},
			/**
			 * Hakee valitun löydön
			 */
			haeLoyto: function (id) {
				var deferred = $q.defer();
				var url = CONFIG.API_URL + "loyto/" + id;
				$http({
					method: 'GET',
					url: url
				}).then(function successCallback(response) {
					deferred.resolve(response.data.data);
				}, function errorCallback(response) {
					console.log("loytoService / haeLoyto - virhe");
					deferred.reject(response);
				});
				return deferred.promise;
			},
			/**
			 * Hakee valitun löydön luettelointinumerolla.
			 */
			haeLoytoLuettelointinumerolla: function (luettelointinumero) {
				var deferred = $q.defer();
				var filterParameters = {
					'luettelointinumero': luettelointinumero,
					'tarkka': true
				};

				this.haeLoydot(filterParameters).then(function success(data) {
					if (data.features.length == 1) {
						deferred.resolve(data.features[0]);
					} else {
						deferred.resolve(false);
					}

				}, function error(data) {
					deferred.reject();
				});

				return deferred.promise;
			},
      /**
			 * Hakee valitun löydön luettelointinumerolla QR koodista
			 */
       haeLoytoLuettelointinumerollaQR: function (luettelointinumero) {
				var deferred = $q.defer();
				var url = CONFIG.API_URL + "loyto/luettelointinumerohaku/" + luettelointinumero;
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
			/**
			 * Tallentaa löydön - luodaan uusi tai päivitetään olemassaolevaa jos id on tiedossa.
			 */
			luoTallennaLoyto: function (loyto) {
				var deferred = $q.defer();
				// Päivitys
				if (loyto.properties.id) {
					delete loyto['properties']['luoja'];
					$http({
						method: 'PUT',
						url: CONFIG.API_URL + 'loyto/' + loyto.properties.id,
						data: loyto
					}).then(function success(response) {
						// Clear the cache
						CacheFactory.get('loytoCache').removeAll();

						$rootScope.$broadcast('Update_data', {
							'type': 'loyto'
						});

						deferred.resolve(response.data.data);
					}, function error(response) {
						deferred.reject(response.data);
					});
				}
				// Luonti, palautetaan luotu yksikkö
				else {
					$http({
						method: 'POST',
						url: CONFIG.API_URL + 'loyto/',
						data: loyto
					}).then(function success(response) {
						// Clear the loytoCache
						CacheFactory.get('loytoCache').removeAll();

						$rootScope.$broadcast('Update_data', {
							'type': 'loyto'
						});

						deferred.resolve(response.data.data);
					}, function error(response) {
						deferred.reject(response);
					});
				}
				return deferred.promise;
			},
			/*
			 * Hakee löydölle korin kautta tehdyt tapahtumat, eli kaikki löydöt joille samanaikainen tapahtuma luotu.
			 */
			haeKoriTapahtumat: function (tapahtuma_id, luotu) {

				var params = {
					'tapahtuma_id': tapahtuma_id,
					'luotu': luotu
				};

				var deferred = $q.defer();

				var url = CONFIG.API_URL + "loyto/kori";

				// Tehdään post haku koska id lista voi olla iso
				$http({
					method: 'POST',
					url: url,
					data: params
				}).then(function successCallback(response) {
					deferred.resolve(response.data.data);
				}, function errorCallback(response) {
					console.log("koriService / haeKorinTiedot - virhe");
					deferred.reject(response);
				});
				return deferred.promise;
			},
			/*
			 * Toteuttaa korin löydöille valitun tilan muutoksen.
			 * Löydoille luodaan tilan muutos tapahtumat samalle "luotu" aikaleimalle.
			 */
			teeKorinTilamuutosTapahtumat: function (kori_id_lista, loyto) {

				var params = {
					'kori_id_lista': kori_id_lista,
					'properties': loyto.properties
				};

				var deferred = $q.defer();

				var url = CONFIG.API_URL + "loyto/kori/tilamuutos";

				// Tehdään post haku koska id lista voi olla iso
				$http({
					method: 'POST',
					url: url,
					data: params
				}).then(function successCallback(response) {

					CacheFactory.get('loytoCache').removeAll();
					$rootScope.$broadcast('Update_data', {
						'type': 'loyto'
					});

					deferred.resolve(response.data.data);

				}, function errorCallback(response) {
					console.log("koriService / haeKorinTiedot - virhe");
					deferred.reject(response);
				});
				return deferred.promise;
			},
			/**
			 * Vaihda löydön luettelointinumero
			 */
			vaihdaLuettelointinumero: function (loyto) {
				var deferred = $q.defer();

				$http({
					method: 'PUT',
					url: CONFIG.API_URL + 'loyto/luettelointinumero/' + loyto.properties.id,
					data: loyto
				}).then(function success(response) {
					// Clear the cache
					CacheFactory.get('loytoCache').removeAll();

					$rootScope.$broadcast('Update_data', {
						'type': 'loyto'
					});

					deferred.resolve(response.data.data);
				}, function error(response) {
					deferred.reject(response.data);
				});

				return deferred.promise;
			},
			/*
			 * Hakee materiaalikoodin id:n mukaiset ensisijaiset materiaalit
			 */
			haeEnsisijaisetMateriaalit: function (id) {
				var deferred = $q.defer();
				var url = CONFIG.API_URL + "loyto/materiaali/ensisijaiset/" + id;
				$http({
					method: 'GET',
					url: url
				}).then(function successCallback(response) {
					deferred.resolve(response.data.data);
				}, function errorCallback(response) {
					// AlertService.showError("Projektin haku epäonnistui");
					console.log("loytoService / haeLoyto - virhe");
					deferred.reject(response);
				});
				return deferred.promise;
			},
			/**
			 * Poista löytö
			 * @param Poistettavan löydön id
			 * @return Promise - Onnistuessa ei palauteta mitään, virhetilanteessa virheilmoitus
			 */
			poistaLoyto: function (loyto) {
				var deferred = $q.defer();
				$http({
					method: 'DELETE',
					url: CONFIG.API_URL + "loyto/" + loyto.properties.id
				}).then(function success(response) {

					// Clear the yksikkoCache
					CacheFactory.get('loytoCache').removeAll();

					deferred.resolve();
				}, function error(response) {
					deferred.reject(response);
				});
				return deferred.promise;
			},
			haeKuntoraportit: function(loytoId) {
				var deferred = $q.defer();
				var url = CONFIG.API_URL + "loyto/" + loytoId + "/kuntoraportit";
				$http({
					method: 'GET',
					url: url
				}).then(function successCallback(response) {
					deferred.resolve(response.data.data);
				}, function errorCallback(response) {
					console.log("loytoService / haeKuntoraportit - virhe");
					deferred.reject(response);
				});
				return deferred.promise;
			},
			luoTallennaKuntoraportti: function (kuntoraportti) {
				var deferred = $q.defer();
				kuntoraportti = angular.copy(kuntoraportti);
				// Päivitys
				if (kuntoraportti.properties.id) {
					delete kuntoraportti['properties']['luoja'];
					$http({
						method: 'PUT',
						url: CONFIG.API_URL + 'kuntoraportti/' + kuntoraportti.properties.id,
						data: kuntoraportti
					}).then(function success(response) {
						$rootScope.$broadcast('Update_data', {
							'type': 'kuntoraportti'
						});

						deferred.resolve(response.data.data);
					}, function error(response) {
						deferred.reject(response.data);
					});
				}
				// Luonti, palautetaan luotu id
				else {
					$http({
						method: 'POST',
						url: CONFIG.API_URL + 'kuntoraportti/',
						data: kuntoraportti
					}).then(function success(response) {
						$rootScope.$broadcast('Update_data', {
							'type': 'kuntoraportti'
						});

						deferred.resolve(response.data.data);
					}, function error(response) {
						deferred.reject(response);
					});
				}
				return deferred.promise;
			},
			poistaKuntoraportti: function (id) {
				var deferred = $q.defer();
				$http({
					method: 'DELETE',
					url: CONFIG.API_URL + "kuntoraportti/" + id
				}).then(function success(response) {
					deferred.resolve(response);
				}, function error(response) {
					deferred.reject(response);
				});
				return deferred.promise;
			}
		}
	}
]);