// eslint-disable-next-line angular/function-type
angular.module('mip.directives').directive('mipKohdeValitsin', [
  'locale', 'ListService', 'KohdeService', '$filter', function (locale, ListService, KohdeService, $filter) {
    function link(scope, elem, attrs) {
      if (scope.valitutKohteet === undefined || scope.valitutKohteet === null) {
        scope.valitutKohteet = [];
      }
      scope.kohdeHaku = function (khaku) {
        scope.kohteet = [];
        var tmp = [];

        // Tmp listaan asetetaan filtteröity lista tutkimuksen kohteista - jo valitut filtteröidään pois
        // jotta ne eivät ole enää uudelleen valittavissa.
        tmp = scope.tutkimus.inventointiKohteet.filter(function (i) {
          return scope.valitutKohteet.map(function (e) {
            return e.id;
          }).indexOf(i.properties.id) < 0;
        });

        tmp.forEach(function (k) {
          scope.kohteet.push(k.properties);
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

      scope.addKohde = function (kohde) {
        scope.valitutKohteet.push(kohde);
      };

      // Huom: ui-selectin bugin takia listalta poistetaan elementti ennen kuin poiston tekevä
      // metodi suoritetaan https://github.com/angular-ui/ui-select/issues/463
      // ui-selectin model on valitutLoydot, mutta silti se palauttaa erillisen modellin jota on muokattu.
      // jos ollaan poistamassa viimeistä linkatttua elementtiä, palautetaan viimeisin poistettu elementti
      // ja näytetään ilmoitus että vimoista linkkausta ei voida poistaa.
      // Samalla ylläpidetään scopen modelia jossa elementit on (valitutYksikot)
      scope.deleteKohde = function (itemToDelete, list) {
        scope.valitutKohteet = list;
      };
    }
    return {
      restrict: 'E',
      link: link,
      scope: {
        tutkimus: '=',
        valitutKohteet: '=',
        entityId: '='
      },
      transclude: true,
      templateUrl: 'ark/directives/kohdevalitsin/mipkohdevalitsin.html'
    };
  }
]);
