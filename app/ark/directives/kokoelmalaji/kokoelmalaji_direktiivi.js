angular.module('mip.directives').directive('mipKokoelmalaji', [
        'locale', 'ListService', function(locale, ListService) {
            /**
             * Kokoelma-ja arkistotieto eli kokoelmalaji.
             */
            function link(scope, elem, attrs) {
                scope.kokoelmalajit = [];
                scope.kokoelmatyyppi = "";

                // direktiivin kutsussa annettava kokoelmatyyppi
                attrs.$observe('kokoelmatyyppi', function(value) {
                      scope.kokoelmatyyppi = value;
                  });

                ListService.getOptions('ark_kokoelmalaji').then(function success(options) {
                    scope.kokoelmalajit = options;
                }, function error(data) {
                    locale.ready('error').then(function() {
                        // TODO
                        // AlertService.showError(locale.getString("error.Getting_culturohistorical_values_failed"), AlertService.message(data));
                    });
                });

                /**
                 * Suodatukset tyypin mukaan:
                 * Löydöt: KM, TKM, TYA = 1,2,4
                 * Raportit: MV, TKM, TYA = 3,2,4
                 * Kartat: MV, TKM, TYA = 3,2,4
                 * Valokuvat: MV, TKM, TYA = 3,2,4
                 * Näytteet: TKM, TYA = 2,4
                 * Toistaiseksi suodatus pois käytöstä. TODO: Tee konfiguroitavaksi.
                 */
                scope.suodata = function (item){
                    return item;
                /*
                	if(scope.kokoelmatyyppi === 'loydot'){
                		if(item.id !== 3){
                			return item;
                		}
                	}else if(scope.kokoelmatyyppi === 'raportit'){
                		if(item.id !== 1){
                			return item;
                		}
                	}else if(scope.kokoelmatyyppi === 'kartat'){
                		if(item.id !== 1){
                			return item;
                		}
                	}else if(scope.kokoelmatyyppi === 'valokuvat'){
                		if(item.id !== 1){
                			return item;
                		}
                	}else if(scope.kokoelmatyyppi === 'naytteet'){
                		if(item.id === 2 || item.id === 4){
                			return item;
                		}
                	}
*/
                };

            }
            return {
                restrict : 'E',
                link : link,
                scope : {
                	laji : '=',
                	haku : '=',
                	vm : '=',
                	lomake : '='
                },
                transclude: true,
                templateUrl : 'ark/directives/kokoelmalaji/kokoelmalaji.html'
            };
        }
]);