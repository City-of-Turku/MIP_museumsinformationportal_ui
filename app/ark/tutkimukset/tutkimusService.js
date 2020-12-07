/*
 * Tutkimus service
 */
angular.module('mip.tutkimus', []);

// eslint-disable-next-line angular/function-type
angular.module('mip.tutkimus').factory('TutkimusService', [
  '$rootScope', '$http', '$q', 'CONFIG', '$location', 'AlertService', '$route', 'ListService', 'UserService', 'CacheFactory',
  function ($rootScope, $http, $q, CONFIG, $location, AlertService, $route, ListService, UserService, CacheFactory) {
    /**
      * Tutkimusten cache selaimeen
      */
    CacheFactory('tutkimusCache', {
      maxAge: 10 * 60 * 1000, // Items added to this cache expire after 10 minutes
      cacheFlushInterval: 60 * 60 * 1000, // This cache will clear itself every hour
      deleteOnExpire: 'passive', // Cache will do nothing when an item expires. Expired items will remain in the cache until requested, at which point they are removed, and undefined is returned.
      capacity: 50
      // Maximum number of items a cache can hold. Adding more items than the capacity will cause the cache to operate like an LRU cache, removing the least recently used items to stay under capacity. Default: Number.MAX_VALUE.
    });

    return {
      /*
       * Hae tutkimukset
       */
      haeTutkimukset: function (params) {
        var queryString = ListService.parseQueryString(params);
        var deferred = $q.defer();
        var url = CONFIG.API_URL + 'tutkimus/' + queryString;
        $http({
          method: 'GET',
          url: url,
          cache: CacheFactory.get('tutkimusCache')
        }).then(function successCallback(response) {
          deferred.resolve(response.data.data);
        }, function errorCallback(response) {
          deferred.reject(response);
        });

        deferred.promise.cancel = function () {
          deferred.resolve('Cancelled');
        };

        return deferred.promise;
      },
      /*
       * Hakee valitun tutkimuksen
       */
      haeTutkimus: function (id) {
        var deferred = $q.defer();
        var url = CONFIG.API_URL + 'tutkimus/' + id;
        $http({
          method: 'GET',
          url: url
        }).then(function successCallback(response) {
          deferred.resolve(response.data.data);
        }, function errorCallback(response) {
          // AlertService.showError("Projektin haku epäonnistui");
          console.log('tutkimusService / haeTutkimus - virhe');
          deferred.reject(response);
        });
        return deferred.promise;
      },
      /*
       * Tallentaa uuden tai muokatun tutkimuksen
       */
      tallennaTutkimus: function (tutkimus) {
        var deferred = $q.defer();

        if (tutkimus.properties.id) {
          $http({
            method: 'PUT',
            url: CONFIG.API_URL + 'tutkimus/' + tutkimus.properties.id,
            data: tutkimus
          }).then(function success(response) {
            CacheFactory.get('tutkimusCache').removeAll();
            /*
             * TutkimusListControllerille tieto päivittää taulukko
             */
            $rootScope.$broadcast('Update_data', {
              type: 'tutkimus'
            });
            deferred.resolve(response);
          }, function error(response) {
            if (CONFIG.DEBUG) {
              console.log('tutkimusService / tallennaTutkimus - virhe');
            }
            deferred.reject(response);
          });
        } else {
          $http({
            method: 'POST',
            url: CONFIG.API_URL + 'tutkimus',
            data: tutkimus
          }).then(function success(response) {
            CacheFactory.get('tutkimusCache').removeAll();
            /*
             * TutkimusListControllerille tieto päivittää taulukko
             */
            $rootScope.$broadcast('Update_data', {
              type: 'tutkimus'
            });
            deferred.resolve(response.data.data.properties.id);
          }, function error(response) {
            if (CONFIG.DEBUG) {
              console.log('tutkimusService / tallennaTutkimus - virhe');
            }
            deferred.reject(response);
          });
        }
        return deferred.promise;
      },
      /*
       * Poista tutkimus
       */
      poistaTutkimus: function (tutkimus) {
        var deferred = $q.defer();

        $http({
          method: 'DELETE',
          url: CONFIG.API_URL + 'tutkimus/' + tutkimus.properties.id
        }).then(function success(response) {
          CacheFactory.get('tutkimusCache').removeAll();

          $rootScope.$broadcast('Update_data', {
            type: 'tutkimus'
          });
          if (CONFIG.DEBUG) {
            console.log('Tutkimuksen poisto OK');
          }
          $route.reload();
          deferred.resolve();
        }, function error(response) {
          if (CONFIG.DEBUG) {
            console.log('TutkimusService / Tutkimuksen poisto epaonnistui.');
          }
          deferred.reject(response);
        });

        return deferred.promise;
      },
      /*
       * Tutkimuksen nimen pitää olla uniikki
       */
      tarkistaNimi: function (nimi) {
        var deferred = $q.defer();
        var filterParameters = {
          nimi: nimi,
          tarkka: 1
        };
        var available = false;
        this.haeTutkimukset(filterParameters).then(function success(data) {
          if (data.features.length === 0) {
            available = true;
          }
          deferred.resolve(available);
        }, function error(data) {
          deferred.reject(available);
        });

        return deferred.promise;
      },
      /*
       * Tutkimuksen lyhenteen pitää olla uniikki, ei pakollinen
       */
      tarkistaTutkimuksenLyhenne: function (tutkimusLyhenne) {
        var deferred = $q.defer();
        var filterParameters = {
          tutkimuksen_lyhenne: tutkimusLyhenne,
          tarkka: 1
        };
        var available = false;

        // Tyhjällä ei tarkisteta
        if (!tutkimusLyhenne) {
          available = true;
          deferred.resolve(available);
        } else {
          // Tarkistus backendista
          this.haeTutkimukset(filterParameters).then(function success(data) {
            if (data.features.length === 0) {
              available = true;
            }
            deferred.resolve(available);
          }, function error(data) {
            deferred.reject(available);
          });
        }

        return deferred.promise;
      },
      /*
       * Päänumeron pitää olla uniikki per kokoelmatunnus
       */
      tarkistaPaanumero: function (tyyppi, paanumero, kokoelmalajiId) {
        var deferred = $q.defer();
        var filterParameters = {
          paanumeroTyyppi: tyyppi,
          paanumero: paanumero,
          kokoelmalaji: kokoelmalajiId
        };
        var available = false;
        this.haeTutkimukset(filterParameters).then(function success(data) {
          if (data.features.length === 0) {
            available = true;
          }
          deferred.resolve(available);
        }, function error(data) {
          deferred.reject(available);
        });

        return deferred.promise;
      },
      muokkaaKayttajia: function (data) { // data: {'tutkimusId': 123, 'lisattavat': [id1, id2, id3], 'poistettavat': [id1, id2, id3]}
        var deferred = $q.defer();
        $http({
          method: 'POST',
          url: CONFIG.API_URL + 'tutkimus/' + data.tutkimusId + '/kayttaja',
          data: data
        }).then(function success(response) {
          $rootScope.$broadcast('Update_data', {
            type: 'tutkimus_kayttajat',
            tutkimusId: response.data.data.properties.id
          });
          deferred.resolve(response.data.data.properties.id);
        }, function error(response) {
          console.log('tutkimusService / muokkaaKayttajia - virhe: ' + response);
          deferred.reject(response);
        });
        return deferred.promise;
      },
      /*
       * Hae katselijakäyttäjälle aktiiviset inventointitutkimukset. Pääkäyttäjä/tutkija eivät tarvitse tätä tietoa, koska heillä
       * on inventointioikeudet muutoinkin.
       */
      getAktiivisetInventointitutkimukset: function () {
        var deferred = $q.defer();
        var url = CONFIG.API_URL + 'tutkimus/aktiiviset_inventointitutkimukset';
        $http({
          method: 'GET',
          url: url
        }).then(function successCallback(response) {
          deferred.resolve(response.data.data);
        }, function errorCallback(response) {
          deferred.reject(response);
        });

        deferred.promise.cancel = function () {
          deferred.resolve('Cancelled');
        };

        return deferred.promise;
      },
      /*
       * Hakee tutkimukseen liittyvien löytöjen ja näytteiden lukumäärän
       * ja digikuvien ensimmäiesn ja viimeisen luettelointinumeron
       */
      getTutkimuksenLukumaarat: function (tutkimusId) {
        var deferred = $q.defer();
        var url = CONFIG.API_URL + 'tutkimus/' + tutkimusId + '/lukumaarat';
        $http({
          method: 'GET',
          url: url
        }).then(function successCallback(response) {
          deferred.resolve(response.data.data);
        }, function errorCallback(response) {
          deferred.reject(response);
        });

        deferred.promise.cancel = function () {
          deferred.resolve('Cancelled');
        };

        return deferred.promise;
      },
      luoTallennaTutkimusraportti: function (tutkimusraportti) {
        var deferred = $q.defer();
        tutkimusraportti = angular.copy(tutkimusraportti);
        // Päivitys
        if (tutkimusraportti.properties.id) {
          delete tutkimusraportti.properties.luoja;
          $http({
            method: 'PUT',
            url: CONFIG.API_URL + 'tutkimusraportti/' + tutkimusraportti.properties.id,
            data: tutkimusraportti
          }).then(function success(response) {
            $rootScope.$broadcast('Update_data', {
              type: 'tutkimusraportti'
            });

            deferred.resolve(response.data.data);
          }, function error(response) {
            deferred.reject(response.data);
          });
        } else { // Luonti, palautetaan luotu id
          $http({
            method: 'POST',
            url: CONFIG.API_URL + 'tutkimusraportti/',
            data: tutkimusraportti
          }).then(function success(response) {
            $rootScope.$broadcast('Update_data', {
              type: 'tutkimusraportti'
            });

            deferred.resolve(response.data.data);
          }, function error(response) {
            deferred.reject(response);
          });
        }
        return deferred.promise;
      },
      poistaTutkimusraportti: function (id) {
        var deferred = $q.defer();
        $http({
          method: 'DELETE',
          url: CONFIG.API_URL + 'tutkimusraportti/' + id
        }).then(function success(response) {
          deferred.resolve(response);
        }, function error(response) {
          deferred.reject(response);
        });
        return deferred.promise;
      },
      haeTutkimusraportti: function ($tutkimusId) {
        var deferred = $q.defer();
        var url = CONFIG.API_URL + 'tutkimusraportti/' + $tutkimusId;
        $http({
          method: 'GET',
          url: url
        }).then(function successCallback(response) {
          deferred.resolve(response.data.data);
        }, function errorCallback(response) {
          deferred.reject(response);
        });

        deferred.promise.cancel = function () {
          deferred.resolve('Cancelled');
        };

        return deferred.promise;
      }
    };
  }
]);
