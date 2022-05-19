/*
 * Näyte service
 */
angular.module('mip.nayte', []);

angular.module('mip.nayte').factory('NayteService', [
		'$rootScope', '$http', '$q', 'CONFIG', '$location', 'AlertService', '$route', 'ListService', 'UserService', 'CacheFactory',
		function ($rootScope, $http, $q, CONFIG, $location, AlertService, $route, ListService, UserService, CacheFactory) {

            /**
             * Näyte cache selaimeen
             */
            CacheFactory('nayteCache', {
                maxAge : 10 * 60 * 1000, // Items added to this cache expire after 10 minutes
                cacheFlushInterval : 60 * 60 * 1000, // This cache will clear itself every hour
                deleteOnExpire : 'passive', // Cache will do nothing when an item expires. Expired items will remain in the cache until requested, at which point they are removed, and undefined is returned.
                capacity : 50
            // Maximum number of items a cache can hold. Adding more items than the capacity will cause the cache to operate like an LRU cache, removing the least recently used items to stay under capacity. Default: Number.MAX_VALUE.
            });

			return {
				/*
				 * Hae näytteet
				 */
				haeNaytteet : function (params) {
					var queryString = ListService.parseQueryString(params);
					var deferred = $q.defer();
					var url = CONFIG.API_URL + 'nayte/' + queryString;
					$http({
						method : 'GET',
						url : url,
						cache : CacheFactory.get('nayteCache')
					}).then(function successCallback (response) {
						deferred.resolve(response.data.data);
					}, function errorCallback (response) {
						deferred.reject(response);
					});

					deferred.promise.cancel = function () {
                        deferred.resolve('Cancelled');
                    };

					return deferred.promise;
				},
				/**
				 * Hakee valitun näytteen
				 */
				haeNayte : function (id) {
					var deferred = $q.defer();
					var url = CONFIG.API_URL + "nayte/" + id;
					$http({
						method : 'GET',
						url : url
					}).then(function successCallback (response) {
						deferred.resolve(response.data.data);
					}, function errorCallback (response) {
						console.log("nayteService / haeNayte - virhe");
						deferred.reject(response);
					});
					return deferred.promise;
				},
				/**
				 * Hakee valitun näytteen luettelointinumerolla.
				 */
				haeNayteLuettelointinumerolla : function (luettelointinumero) {
					var deferred = $q.defer();
					var filterParameters = {
							'luettelointinumero':  luettelointinumero,
							'tarkka': true
					};

					this.haeNaytteet(filterParameters).then(function success (data) {
						if (data.features.length == 1) {
							deferred.resolve(data.features[0]);
						}else{
							deferred.resolve(false);
						}

					}, function error (data) {
						deferred.reject();
					});

					return deferred.promise;
				},
        /**
         * Hakee valitun näytteen luettelointinumerolla QR koodista
         */
        haeNayteLuettelointinumerollaQR: function (luettelointinumero) {
          var deferred = $q.defer();
          var url = CONFIG.API_URL + "nayte/luettelointinumerohaku/" + luettelointinumero;
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
                 * Tallentaa näytteen - luodaan uusi tai päivitetään olemassaolevaa jos id on tiedossa.
                 */
                luoTallennaNayte: function(nayte) {
                    var deferred = $q.defer();
                    // Päivitys
                    if (nayte.properties.id) {
                        $http({
                            method : 'PUT',
                            url : CONFIG.API_URL + 'nayte/' + nayte.properties.id,
                            data : nayte
                        }).then(function success(response) {
                            // Clear the cache
                            CacheFactory.get('nayteCache').removeAll();

                            $rootScope.$broadcast('Update_data', {
                                'type' : 'nayte'
                            });

                            deferred.resolve(response.data.data);
                        }, function error(response) {
                            deferred.reject(response.data);
                        });
                    }
                    // Luonti, palautetaan luotu näyte
                    else {
                        $http({
                            method : 'POST',
                            url : CONFIG.API_URL + 'nayte/',
                            data : nayte
                        }).then(function success(response) {
                            // Clear the loytoCache
                            CacheFactory.get('nayteCache').removeAll();

                            $rootScope.$broadcast('Update_data', {
                                'type' : 'nayte'
                            });

                            deferred.resolve(response.data.data);
                        }, function error(response) {
                            deferred.reject(response);
                        });
                    }
                    return deferred.promise;
                },
				/*
				 * Hakee näytteelle korin kautta tehdyt tapahtumat, eli kaikki näytteet joille samanaikainen tapahtuma luotu.
				 */
				haeKoriTapahtumat : function (tapahtuma_id, luotu) {

					var params = {
							'tapahtuma_id': tapahtuma_id,
							'luotu' : luotu
						};

					var deferred = $q.defer();

					var url = CONFIG.API_URL + "nayte/kori";

					// Tehdään post haku koska id lista voi olla iso
					$http({
						method : 'POST',
						url : url,
						data : params
					}).then(function successCallback (response) {
						deferred.resolve(response.data.data);
					}, function errorCallback (response) {
						console.log("nayteService / haeKorinTiedot - virhe");
						deferred.reject(response);
					});
					return deferred.promise;
				},
				/*
				 * Toteuttaa korin näytteille valitun tilan muutoksen.
				 * Näytteille luodaan tilan muutos tapahtumat samalle "luotu" aikaleimalle.
				 */
				teeKorinTilamuutosTapahtumat : function (kori_id_lista, nayte) {

					var params = {
							'kori_id_lista': kori_id_lista,
							'properties' : nayte.properties
						};

					var deferred = $q.defer();

					var url = CONFIG.API_URL + "nayte/kori/tilamuutos";

					// Tehdään post haku koska id lista voi olla iso
					$http({
						method : 'POST',
						url : url,
						data : params
					}).then(function successCallback (response) {

                        CacheFactory.get('nayteCache').removeAll();
                        $rootScope.$broadcast('Update_data', {
                            'type' : 'nayte'
                        });

						deferred.resolve(response.data.data);

					}, function errorCallback (response) {
						console.log("nayteService / haeKorinTiedot - virhe");
						deferred.reject(response);
					});
					return deferred.promise;
				},
				/*
				 * Hakee näytekoodin id:n mukaiset naytetyypit
				 */
				haeNaytetyypit : function (id) {
					var deferred = $q.defer();
					var url = CONFIG.API_URL + "nayte/naytetyypit/" + id;
					$http({
						method : 'GET',
						url : url
					}).then(function successCallback (response) {
						deferred.resolve(response.data.data);
					}, function errorCallback (response) {
						console.log("nayteService / haeNayte - virhe");
						deferred.reject(response);
					});
					return deferred.promise;
				},
                /**
                 * Poista näyte
                 * @param Poistettavan näytteen id
                 * @return Promise - Onnistuessa ei palauteta mitään, virhetilanteessa virheilmoitus
                 */
                poistaNayte : function(nayte) {
                    var deferred = $q.defer();
                    $http({
                        method : 'DELETE',
                        url : CONFIG.API_URL + "nayte/" + nayte.properties.id
                    }).then(function success(response) {

                        CacheFactory.get('nayteCache').removeAll();

                        deferred.resolve();
                    }, function error(response) {
                        deferred.reject(response);
                    });
                    return deferred.promise;
                },
				/*
				 * Hakee seuraavan vapaan näytteen alanumeron per tutkimus ja näytekoodi
				 */
				haeNaytteenAlanumero : function (tutkimus_id, naytekoodi_id) {
					var params = {
							'tutkimus_id': tutkimus_id,
							'naytekoodi_id' : naytekoodi_id
						};

					var deferred = $q.defer();
					var url = CONFIG.API_URL + "nayte/alanumero/";
					$http({
						method : 'POST',
						url : url,
						data : params
					}).then(function successCallback (response) {
						deferred.resolve(response.data.data);
					}, function errorCallback (response) {
						console.log("nayteService / haeNaytteenAlanumero - virhe");
						deferred.reject(response);
					});
					return deferred.promise;
				},
				/*
				 * Uniikin luettelointinumeron tarkistus
				 */
				tarkistaLuettelointinumero : function (luettelointinumero) {
					var deferred = $q.defer();
					var filterParameters = {
						'uniikki_numero' : 'uniikki_numero',
						'luettelointinumero': luettelointinumero
					};
					var available = false;
                    CacheFactory.get('nayteCache').removeAll();
					this.haeNaytteet(filterParameters).then(function success (data) {
						if (data.features.length == 0) {
							available = true;
						}
						deferred.resolve(available);
					}, function error (data) {
						deferred.reject(available);
					});

					return deferred.promise;
				}
			}
		}
]);