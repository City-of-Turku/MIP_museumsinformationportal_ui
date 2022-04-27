/* eslint-disable quote-props */
/* eslint-disable indent */
/* eslint-disable angular/function-type */
/* eslint-disable space-before-blocks */
/* eslint-disable angular/controller-as */
/* eslint-disable padded-blocks */
/* eslint-disable space-before-function-paren */
/* eslint-disable dot-notation */
/*
 * ARK puolen korien listaus controller. Korit välilehden avaus.
 */
angular.module('mip.kori').controller('ArkKoriListController', [
  '$scope', '$controller', 'KoriService', 'AlertService', 'ModalService', 'locale',
  function ($scope, $controller, KoriService, AlertService, ModalService, locale) {
    var vm = this;

    /** Setup-metodi */
    vm.setUp = function () {
      // Logiikka löytyy pääluokasta KoriListController
      angular.extend(vm, $controller('KoriListController', { $scope: $scope }));

      vm.asetaMip('ARK');
      vm.showQRCodeButton = true;
      vm.korihaku = false;

      // Tabin asetus
      vm.updateTabs('common.Archeology', 'common.Carts');

    };
    vm.setUp();

    $scope.haeKoriNimella = function(nimi) {
      if (nimi.length > 0) {
        if (nimi.indexOf('http') === -1 && nimi.indexOf('www.') === -1) {
          KoriService.haeKorit({'nimi':nimi,'mip_alue':'ARK'}).then(function(data){
            if (data.count > 1) {
              AlertService.showError(locale.getString('common.Error'), locale.getString('error.Too_many_baskets'));
              $scope.scannerText = '';
            }
            else if(data.count === 0){
              AlertService.showError(locale.getString('common.Error'), 'Virheellinen korin nimi: ' + nimi);
              $scope.scannerText = '';
            }
            else{
              ModalService.koriModal(data['features'][0], vm.mip);
              $scope.scannerText = '';
            }
          },function error(error) {
            console.log(error);
            AlertService.showError(locale.getString('common.Error'), AlertService.message(error) + ' ' + nimi);
            $scope.scannerText = '';
          });
        }
      }
    };

    // Event for successful QR code reading
    $scope.onSuccess = function (data) {
      //console.log(data);
      $scope.scannerText = data;
      this.$hide();
      $scope.haeKoriNimella(data);
    }

    // Event for error QR code reading
    $scope.onError = function (error) {
      console.log(error);
      // TODO: Käännökset virheilmoituksille?
      if(error === "Couldn't find enough finder patterns") {
        vm.showStatus('Scanning...');
      } else if (error === "URIError: URI malformed") {
        vm.showStatus("Couldn't read code properly.");
      } else {
        vm.showStatus(error);
      }
    };

    // Event for video error (no permission for camera etc.)
    $scope.onVideoError = function (error) {
      console.log(error);
      vm.showStatus(error);
    };

    vm.showStatus = function (text) {
      $scope.scannerErrorText = text;
    }
  }
]);
