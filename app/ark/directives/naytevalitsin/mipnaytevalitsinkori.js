angular.module('mip.directives').directive('mipNayteValitsinKori', [
    'locale', 'NayteService', 'AlertService', '$rootScope', function(locale, NayteService, AlertService, $rootScope) {
        /**
         * Direktiivi jolla voi lisätä näytteitä korinäkymässä
         */
        function link(scope, elem, attrs) {
            scope.lhakutulos = [];
            scope.nayteHaku = function(lhaku){
                scope.lhakutulos = [];
                if (lhaku.length == 0) return;
                NayteService.haeNayteLuettelointinumerolla(lhaku).then(function(nayte) {
                    if (nayte){
                        scope.lhakutulos = [nayte.properties];
                    }
                });

            };
        }

        return {
            restrict : 'E',
            link : link,
            scope : {
                nayte : "&func"
            },
            transclude: true,
            templateUrl : 'ark/directives/naytevalitsin/mipnaytevalitsinkori.html',
            controller: function ($scope){
                $scope.addNayte = function(valittuNayte) {
                    if ($scope.nayte){
                        $scope.nayte({id: valittuNayte.id});
                    }
                }
            }
        };
    }
]);