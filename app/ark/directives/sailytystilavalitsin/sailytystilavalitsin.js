angular.module('mip.directives').directive('mipSailytystila', [
        'locale', 'ListService', '$rootScope', function(locale, ListService, $rootScope) {
            /**
             * Sailytystilan valitsin
             */
            function link(scope, elem, attrs) {
                scope.sailytystilat = [];

                ListService.getOptions('ark_sailytystila').then(function success(options) {
                    scope.sailytystilat = options;
                }, function error(data) {
                    locale.ready('error').then(function() {
                        // TODO
                        // AlertService.showError(locale.getString("error.Getting_culturohistorical_values_failed"), AlertService.message(data));
                        console.log(data);
                    });
                });
            }
            return {
                restrict : 'E',
                link : link,
                scope : {
                    sailytystila : '=',
                    req : '=',
                    dis : '='
                },
                transclude: true,
                templateUrl : 'ark/directives/sailytystilavalitsin/sailytystila.html'
            };
        }
]);