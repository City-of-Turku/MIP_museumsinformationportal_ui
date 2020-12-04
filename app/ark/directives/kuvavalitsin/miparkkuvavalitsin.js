// eslint-disable-next-line angular/function-type
angular.module('mip.directives').directive('mipArkKuvaValitsin', [
  'locale', 'ListService', 'FileService', '$filter', 'AlertService', function (locale, ListService, FileService, $filter, AlertService) {
    function link(scope, elem, attrs) {
      scope.cancelRequest = function (promise) {
        promise.cancel();
      };

      scope.kuvaHaku = function (khaku) {
        scope.khakutulos = [];
        var luetteloituSearchObj = {
          jarjestys_suunta: 'nouseva',
          rivit: 1000,
          ark_tutkimus_id: scope.tutkimusId,
          luetteloitu: true,
          luettelointinumero: khaku
        };
        if (scope.luetteloidutPromise !== undefined) {
          scope.cancelRequest(scope.luetteloidutPromise);
        }
        scope.luetteloidutPromise = FileService.getArkImages(luetteloituSearchObj);
        scope.luetteloidutPromise.then(function success(result) {
          if (result.features) {
            var tmp = result.features.filter(function (i) {
              return scope.valitutKuvat.map(function (e) {
                return e.id;
              }).indexOf(i.properties.id) < 0;
            });

            for (var i = 0; i < tmp.length; i++) {
              scope.khakutulos.push(tmp[i].properties);
            }
          }
        }, function error(data) {
          locale.ready('error').then(function () {
            AlertService.showError(locale.getString('error.Getting_images_failed'), AlertService.message(data));
          });
        });
        var luetteloimatonSearchObj = {
          jarjestys_suunta: 'nouseva',
          rivit: 1000,
          ark_tutkimus_id: scope.tutkimusId,
          luetteloitu: false,
          otsikko: khaku
        };
        if (scope.luetteloimattomatPromise !== undefined) {
          scope.cancelRequest(scope.luetteloimattomatPromise);
        }
        scope.luetteloimattomatPromise = FileService.getArkImages(luetteloimatonSearchObj);
        scope.luetteloimattomatPromise.then(function success(result) {
          if (result.features) {
            var tmp = result.features.filter(function (i) {
              return scope.valitutKuvat.map(function (e) {
                return e.id;
              }).indexOf(i.properties.id) < 0;
            });

            for (var i = 0; i < tmp.length; i++) {
              scope.khakutulos.push(tmp[i].properties);
            }
          }
        }, function error(data) {
          locale.ready('error').then(function () {
            AlertService.showError(locale.getString('error.Getting_images_failed'), AlertService.message(data));
          });
        });
      };

      scope.addItemBackToList = function (item, model) {
        for (var i = 0; i < model.length; i++) {
          if (model[i].id === item.id) {
            return;
          }
        }
        model.push(item);
      };
      // Huom: ui-selectin bugin takia listalta poistetaan elementti vaikka modelliin valitutKuvat ei lisätä elementtiä
      // metodi suoritetaan https://github.com/angular-ui/ui-select/issues/463
      scope.addImage = function (kuva, list) {
        if (scope.kappale === 'kansilehti' && scope.valitutKuvat.length > 0) {
          list.splice(-1, 1); // Ei jätetä itemiä hillumaan ui-selectin listaan kun sitä ei lisätä myöskään valittuihin kuviin!
          AlertService.showWarning(locale.getString('ark.Titlepage_may_contain_only_one_image'));
        } else {
          scope.valitutKuvat.push(kuva);
        }
      };

      scope.deleteImage = function (itemToDelete, list) {
        scope.valitutKuvat = list;
      };
    }
    return {
      restrict: 'E',
      link: link,
      scope: {
        valitutKuvat: '=',
        kappale: '=',
        tutkimusId: '='
      },
      transclude: true,
      templateUrl: 'ark/directives/kuvavalitsin/miparkkuvavalitsin.html'
    };
  }
]);
