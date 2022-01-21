/*
 * Löytö service
 */
angular.module('mip.kori', []);

angular.module('mip.kori').factory('KoriService', [
		'$rootScope', '$http', '$q', 'CONFIG', '$location', 'AlertService', '$route', 'ListService', 'UserService', 'CacheFactory', 
		function ($rootScope, $http, $q, CONFIG, $location, AlertService, $route, ListService, UserService, CacheFactory) {
			
            /**
             * Kori cache selaimeen
             */
            CacheFactory('koriCache', {
                maxAge : 10 * 60 * 1000, // Items added to this cache expire after 10 minutes
                cacheFlushInterval : 60 * 60 * 1000, // This cache will clear itself every hour
                deleteOnExpire : 'passive', // Cache will do nothing when an item expires. Expired items will remain in the cache until requested, at which point they are removed, and undefined is returned.
                capacity : 50
            // Maximum number of items a cache can hold. Adding more items than the capacity will cause the cache to operate like an LRU cache, removing the least recently used items to stay under capacity. Default: Number.MAX_VALUE.
            });
			
			return {
				/*
				 * Hae korit
				 */
				haeKorit : function (params) {
					var queryString = ListService.parseQueryString(params);
					var deferred = $q.defer();
					var url = CONFIG.API_URL + 'kori/' + queryString;
					$http({
						method : 'GET',
						url : url
					}).then(function successCallback (response) {
						deferred.resolve(response.data.data);
					}, function errorCallback (response) {
						if (CONFIG.DEBUG) {
							console.log("koriService - fail : " + response);
						}
						deferred.reject(response);
					});

					return deferred.promise;
				},
				/*
				 * Hakee korin id:n mukaan
				 */
				haeKori : function (id) {
					var deferred = $q.defer();
					var url = CONFIG.API_URL + 'kori/' + id;
					$http({
						method : 'GET',
						url : url
					}).then(function successCallback (response) {
						deferred.resolve(response.data.data);
					}, function errorCallback (response) {
						if (CONFIG.DEBUG) {
							console.log("koriService - haeKori virhe : " + response);
						}
						deferred.reject(response);
					});

					return deferred.promise;
				},
				haeKoriNimella : function (koriNimi) {
					var deferred = $q.defer();
					var url = CONFIG.API_URL + 'kori/nimi/' + koriNimi;
					$http({
						method : 'GET',
						url : url
					}).then(function successCallback (response) {
						deferred.resolve(response.data.data);
					}, function errorCallback (response) {
						if (CONFIG.DEBUG) {
							console.log("koriService - haeKori virhe : " + response);
						}
						deferred.reject(response);
					});

					return deferred.promise;
				},
				/*
				 * Hakee korityypin taulun nimen mukaan
				 */
				haeKorityyppi : function (taulu) {
					var deferred = $q.defer();
					var url = CONFIG.API_URL + 'kori/korityyppi/' + taulu;
					$http({
						method : 'GET',
						url : url
					}).then(function successCallback (response) {
						deferred.resolve(response.data.data);
					}, function errorCallback (response) {
						if (CONFIG.DEBUG) {
							console.log("koriService - haeKorityyppi virhe : " + response);
						}
						deferred.reject(response);
					});

					return deferred.promise;
				},
				/*
				 * Hakee annetun tyypin ja id listan mukaiset korin tiedot
				 */
				haeKorinTiedot : function (korityyppi, params) {
					
					if(!korityyppi){
						AlertService.showError("Korityyppi puuttuu");
					}
					
					var deferred = $q.defer();
					
					var url = CONFIG.API_URL;
					// ARK korit
					var loytoUrl = "loyto/kori";
					var nayteUrl = "nayte/kori";
					
					// RAK korit
					var kiinteistoUrl = "kiinteisto/kori";
					var rakennusUrl = "rakennus/kori";
					var arvoalueUrl = "arvoalue/kori";
					var alueUrl = "alue/kori";
					var kuvaUrl = "kuva/kori";
					
					var hakuKorityyppi = null;
					if(korityyppi.properties){
						hakuKorityyppi = korityyppi.properties;
					}else{
						hakuKorityyppi = korityyppi;
					}
					
					// Lisää tähän muut korityypit tarpeen mukaan
					if(hakuKorityyppi.taulu === 'ark_loyto'){
						url = url + loytoUrl;	
					} else if(hakuKorityyppi.taulu === 'ark_nayte'){
						url = url + nayteUrl;
					} else if(hakuKorityyppi.taulu === 'kiinteisto'){
						url = url + kiinteistoUrl;
					} else if(hakuKorityyppi.taulu === 'rakennus'){
						url = url + rakennusUrl;
					} else if(hakuKorityyppi.taulu === 'arvoalue'){
						url = url + arvoalueUrl;
					} else if(hakuKorityyppi.taulu === 'alue'){
						url = url + alueUrl;
					} else if(hakuKorityyppi.taulu === 'kuva'){
						url = url + kuvaUrl;
					}
					
					// Tehdään post haku koska id lista voi olla iso
					$http({
						method : 'POST',
						url : url,
						data : params
					}).then(function success(response) {
						deferred.resolve(response.data.data);
					}, function error (response) {
						console.log("koriService / haeKorinTiedot - virhe");
						deferred.reject(response);
					});
					return deferred.promise;
				},
                /**
                 * Tallenna tai luo uusi kori
                 */
                luoTallennaKori: function(kori) {
                    var deferred = $q.defer();
                    // Päivitys
                    if (kori.properties.id) {

                        $http({
                            method : 'PUT',
                            url : CONFIG.API_URL + 'kori/' + kori.properties.id,
                            data : kori
                        }).then(function success(response) {
                            // Clear the cache
                            //CacheFactory.get('koriCache').removeAll();
                            
                            $rootScope.$broadcast('Update_data', {
                                'type' : 'kori'
                            });

                            deferred.resolve(response.data.data);
                        }, function error(response) {
                            deferred.reject(response.data);
                        });
                    }
                    // Luonti, palautetaan luotu kori
                    else {
                        $http({
                            method : 'POST',
                            url : CONFIG.API_URL + 'kori/',
                            data : kori
                        }).then(function success(response) {
                            // Clear the loytoCache
                            //CacheFactory.get('koriCache').removeAll();
                            
                            $rootScope.$broadcast('Update_data', {
                                'type' : 'kori'
                            });

                            deferred.resolve(response.data.data);
                        }, function error(response) {
                            deferred.reject(response);
                        });
                    }
                    return deferred.promise;
                },
                /**
                 * Poista kori id:n mukaan
                 */
                poistaKori : function(id) {
                    var deferred = $q.defer();
                    $http({
                        method : 'DELETE',
                        url : CONFIG.API_URL + "kori/" + id
                    }).then(function success(response) {

                        $rootScope.$broadcast('Update_data', {
                            'type' : 'kori'
                        });
                    	
                        deferred.resolve();
                    }, function error(response) {
                        deferred.reject(response);
                    });
                    return deferred.promise;
                }
			}
		}
]);