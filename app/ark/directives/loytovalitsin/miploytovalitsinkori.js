angular.module('mip.directives').directive('mipLoytoValitsinKori', [
    'locale', 'LoytoService', 'AlertService', '$rootScope', function(locale, LoytoService, AlertService, $rootScope) {
        /**
         * Direktiivi jolla voi lisätä löytöjä korinäkymässä
         */
        function link(scope, elem, attrs) {
            scope.lhakutulos = [];
            scope.loytoHaku = function(lhaku){
                scope.lhakutulos = [];
                if (lhaku.length == 0) return;
                LoytoService.haeLoytoLuettelointinumerolla(lhaku).then(function(loyto) {
                    if (loyto){
                        scope.lhakutulos = [loyto.properties];
                    }
                });

            };
        }

        return {
            restrict : 'E',
            link : link,
            scope : {
                loyto : "&func"
            },
            transclude: true,
            templateUrl : 'ark/directives/loytovalitsin/miploytovalitsinkori.html',
            controller: function ($scope){
                $scope.addLoyto = function(valittuLoyto) {
                    if ($scope.loyto){
                        $scope.loyto({id: valittuLoyto.id});
                    }
                }
            }
        };
    }
]);