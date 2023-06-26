angular.module('mip.general').controller(
    'TyokaluController',
    [
            '$scope', '$http', 'CONFIG', 'TyokaluService', 'TabService', '$location', '$filter',
            'NgTableParams', 'ListService', 'AlertService', 'locale', '$rootScope', 'Auth', 'ListControllerService',
            function($scope, $http, CONFIG, TyokaluService, TabService, $location, $filter,
                    NgTableParams, ListService, AlertService, locale, $rootScope, Auth, ListControllerService) {

                var vm = this;

                /**
                 * Setup-metodi - ajetaan vain kertaalleen
                 */
                vm.setUp = function() {
                    angular.extend(vm, ListControllerService);
                    vm.updateTabs('common.Administration', 'common.Admin_tools');
                }
                locale.ready('common').then(function() {
                    vm.setUp();
                });

                vm.updateMuinaisjaannokset = function(){
                    TyokaluService.updateMuinaisjaannokset();
                };

            }
    ]);