/*
 * Tyokalu service
 */

angular.module('mip.general').factory('TyokaluService', [
    '$rootScope', '$http', '$q', 'CONFIG', '$location', 'AlertService', 'ListService', 'UserService', 'CacheFactory',
    function ($rootScope, $http, $q, CONFIG, $location, AlertService, ListService, UserService, CacheFactory) {
        return {

            updateMuinaisjaannokset : function (){
                var deferred = $q.defer();
                var url = CONFIG.API_URL + 'kyppi/paivitaMuinaisjaannokset';
                $http({
                    method : 'GET',
                    url : url
                }).then(function successCallback (response) {
                    deferred.resolve(response.data.data);
                }, function errorCallback (response) {
                    deferred.reject(response);
                });

                return deferred.promise;
            },

        }
    }
]);