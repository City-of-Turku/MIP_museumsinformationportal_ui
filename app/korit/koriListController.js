/*
 * Korien listaus controller. Korit välilehti.
 */
angular.module('mip.kori').controller('KoriListController', [
		'$scope', 'TabService', '$location', 'CONFIG', '$filter', 'NgTableParams', 'KoriService', 'ModalService',
		'AlertService', 'ListService', 'locale', '$rootScope', 'Auth', 'ListControllerService', '$controller',
		function($scope, TabService, $location, CONFIG, $filter, NgTableParams, KoriService, ModalService,
				AlertService, ListService, locale, $rootScope, Auth, ListControllerService, $controller) {

			var vm = this;

            /**
             * Setup-metodi
             */
            vm.setUp = function() {

                angular.extend(vm, ListControllerService);

            };
            vm.setUp();

            /**
             * MIP on joko RAK tai ARK, riippuen mikä Korit-välilehti on valittu.
             */
            vm.mip = '';
            vm.asetaMip = function (lahde){
            	vm.mip = lahde;
            };

            /*
             * ModalHeader kutsuu scopesta closea
             */
            $scope.close = function() {
            	vm.close();
            	$scope.$destroy();
            };

			/*
			 * Korit
			 */
            vm.koriTable = new NgTableParams({
                page : 1,
                count : 50,
                total : 25
            }, {
            	defaultSort : "asc",
                getData : function($defer, params) {

                    if(vm.promise !== undefined) {
                        vm.cancelRequest();
                    }

                    filterParameters = ListService.parseParameters(params);

                    // Suodatus MIP alueen mukaan RAK tai ARK
                    filterParameters['mip_alue'] = vm.mip;

                    vm.koritPromise = KoriService.haeKorit(filterParameters);
                    vm.koritPromise.then(function(data) {

                        if (data.count) {
                            vm.searchResults = data.count;
                        } else {
                            vm.searchResults = 0;
                        }

                        params.total(data.total_count);
                        $defer.resolve(data.features);

                    }, function(data) {
                        locale.ready('common').then(function() {
                            AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
                        });
                        orderedData = [];
                        $defer.resolve(orderedData);
                    });
                }
            });

            /*
             * Uuden korin lisäys
             */
            vm.uusiKori = function (){

            	// Alustetaan uusi kori.
            	vm.kori = {
            		'properties':{
            			'mip_alue' : vm.mip,
            			'julkinen' : true,
            			'korityyppi': null
            		}
            	};
            	// Avataan kori muokkaustilaan
            	ModalService.uusiKoriModal(vm.kori, vm.mip);
            };

            /*
             * Korin valinta. Haetaan aina uudelleen, jotta on päivitetyt tiedot
             */
            vm.avaaKori = function(kori){
            	KoriService.haeKori(kori.properties.id).then(function(haettuKori) {
                    ModalService.koriModal(haettuKori, vm.mip);
				});
            };

			/*
			 * Päivitetään korien taulukko, jos tiedot päivittyneet
			 */
            $scope.$on('Update_data', function(event, data) {
                if (data.type == 'kori') {
                    vm.koriTable.reload();
                }
            });
		}
]);
