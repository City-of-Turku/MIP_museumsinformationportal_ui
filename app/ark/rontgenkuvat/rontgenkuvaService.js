/*
 * Röntgenkuvan service
 */

angular.module('mip.file').factory('RontgenkuvaService', [
		'$rootScope', '$http', '$q', 'CONFIG', '$location', 'AlertService', '$route', 'ListService', 'UserService', 'CacheFactory',
		function ($rootScope, $http, $q, CONFIG, $location, AlertService, $route, ListService, UserService, CacheFactory) {

            /**
             * Löytö cache selaimeen
             */
            CacheFactory('rontgenkuvaCache', {
                maxAge : 10 * 60 * 1000, // Items added to this cache expire after 10 minutes
                cacheFlushInterval : 60 * 60 * 1000, // This cache will clear itself every hour
                deleteOnExpire : 'passive', // Cache will do nothing when an item expires. Expired items will remain in the cache until requested, at which point they are removed, and undefined is returned.
                capacity : 50
            // Maximum number of items a cache can hold. Adding more items than the capacity will cause the cache to operate like an LRU cache, removing the least recently used items to stay under capacity. Default: Number.MAX_VALUE.
            });

			return {
				/*
				 * Hae
				 */
				haeRontgenkuvat : function (params) {
					var queryString = ListService.parseQueryString(params);
					var deferred = $q.defer();
					var url = CONFIG.API_URL + 'rontgenkuva/' + queryString;
					$http({
						method : 'GET',
						url : url,
						cache : CacheFactory.get('rontgenkuvaCache')
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
				 * Hakee valitun löydön
				 */
				haeRontgenkuva : function (id) {
					var deferred = $q.defer();
					var url = CONFIG.API_URL + "rontgenkuva/" + id;
					$http({
						method : 'GET',
						url : url
					}).then(function successCallback (response) {
						deferred.resolve(response.data.data);
					}, function errorCallback (response) {
						console.log("rontgenkuvaService / haerontgenkuva - virhe");
						deferred.reject(response);
					});
					return deferred.promise;
				},
                /**
                 * Tallentaa löydön - luodaan uusi tai päivitetään olemassaolevaa jos id on tiedossa.
                 */
                luoTallennaRontgenkuva: function(xray) {
                    var deferred = $q.defer();
                    // Päivitys
                    if (xray.properties.id) {
                        $http({
                            method : 'PUT',
                            url : CONFIG.API_URL + 'rontgenkuva/' + xray.properties.id,
                            data : xray
                        }).then(function success(response) {
                            // Clear the cache
                            CacheFactory.get('rontgenkuvaCache').removeAll();

                            $rootScope.$broadcast('arkXray_modified', {
                                'type' : 'rontgenkuva'
                            });

                            deferred.resolve(response.data.data);
                        }, function error(response) {
                            deferred.reject(response.data);
                        });
                    }
                    // Luonti, palautetaan luotu yksikkö
                    else {
                        $http({
                            method : 'POST',
                            url : CONFIG.API_URL + 'rontgenkuva/',
                            data : xray
                        }).then(function success(response) {
                            // Clear the rontgenkuvaCache
                            CacheFactory.get('rontgenkuvaCache').removeAll();

                            $rootScope.$broadcast('arkXray_modified', {
                                'type' : 'rontgenkuva'
                            });
                            $rootScope.$broadcast('Update_loyto', {
                                type: 'loyto'
                              });

                            deferred.resolve(response.data.data);
                        }, function error(response) {
                            deferred.reject(response);
                        });
                    }
                    return deferred.promise;
                },
                /**
                 * Poista löytö
                 * @param Poistettavan löydön id
                 * @return Promise - Onnistuessa ei palauteta mitään, virhetilanteessa virheilmoitus
                 */
                poistaRontgenkuva : function(xray) {
                    var deferred = $q.defer();
                    $http({
                        method : 'DELETE',
                        url : CONFIG.API_URL + "rontgenkuva/" + xray.properties.id
                    }).then(function success(response) {

                        // Clear the yksikkoCache
                        CacheFactory.get('rontgenkuvaCache').removeAll();
                        $rootScope.$broadcast('arkXray_modified', {
                            'type' : 'rontgenkuva'
                        });
                        $rootScope.$broadcast('Update_loyto', {
                            type: 'loyto'
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