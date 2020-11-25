/*
 * Löydön kuntoraportin luontinäkymä
 */
angular.module('mip.konservointi').controller(
  'ArkKuntoraporttiController',
  [
    '$scope', '$rootScope', 'AlertService', 'locale', 'LoytoService', 'loyto', 'FileService', 'permissions', 'UserService',
    'selectedModalNameId', 'ModalControllerService', 'kuntoraportti', 'RaporttiService', 'tutkimus', 'ModalService',
    function ($scope, $rootScope, AlertService, locale, LoytoService, loyto, FileService, permissions, UserService,
      selectedModalNameId, ModalControllerService, kuntoraportti, RaporttiService, tutkimus, ModalService) {

      var vm = this;

      /**
       * Controllerin set-up.
       */
      vm.setUp = function () {

        angular.extend(vm, ModalControllerService);

        // Valitun modalin nimi ja järjestysnumero
        vm.modalNameId = selectedModalNameId;
        vm.setModalId();

        vm.kuntoraportti = kuntoraportti;
        vm.loyto = loyto;
        vm.tutkimus = tutkimus;

        vm.create = vm.kuntoraportti.properties.id == null ? true : false;
        vm.edit = vm.create == true ? true : false;

        vm.permissions = permissions;

      };
      vm.setUp();

      /**
       * Sulkemisruksi.
       */
      $scope.close = function () {
        vm.close();
        $scope.$destroy();
      };

      vm._cancelEdit = function () {
        vm.edit = false;
        if (vm.create) {
          vm.close();
        }
      };

      /**
       * Tallenna kuntoraporttti
       */
      vm.save = function () {
        if ($scope.form.$invalid) {
          return;
        }
        vm.kuntoraportti.properties.ark_loyto_id = vm.loyto.id;
        vm.disableButtons = true;
        LoytoService.luoTallennaKuntoraportti(vm.kuntoraportti).then(function (data) {
          vm.kuntoraportti.properties.id = data.properties.id;
          vm.original = angular.copy(vm.kuntoraportti);

          AlertService.showInfo(locale.getString('common.Save_ok'), "");

          vm.disableButtonsFunc();

          // Katselutila päälle
          vm.edit = false;
          vm.create = false;

          $rootScope.$broadcast('Kuntoraportti_update', {
            'loytoId': vm.loyto.id
          });

        }, function error() {
          AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
          vm.disableButtonsFunc();
        });
      }

      vm.deleteKuntoraportti = function () {
        var conf = confirm(locale.getString('common.Confirm_delete2', { 'item': 'Kuntoraportti ' + vm.kuntoraportti.properties.id }));
        if (conf) {
          LoytoService.poistaKuntoraportti(vm.kuntoraportti.properties.id).then(function () {
            vm.close();

            locale.ready('ark').then(function () {
              AlertService.showInfo(locale.getString('ark.Condition_report_deleted'));
            });

            $rootScope.$broadcast('Kuntoraportti_update', {
              'loytoId': vm.loyto.id
            });
          }, function error(data) {
            locale.ready('error').then(function () {
              AlertService.showError(locale.getString("error.Delete_report_failed"), AlertService.message(data));
            });
          });

        }
      }

      /*
       * Create a report
       * type: PDF / WORD / EXCEL ...
       */
      vm.createReport = function (type) {

        //Asetetaan raportin "nimi" joka näkyy mm. raportit-välilehdellä
        //Raportin nimi + löydön luettelointinumero
        var reportDisplayName = locale.getString('ark.Research') + " " + vm.kuntoraportti.loyto.properties.luettelointinumero; // TODO: Muuta nimi

        var report = { 'requestedOutputType': type, 'reportDisplayName': reportDisplayName, 'kuntoraporttiId': vm.kuntoraportti.properties.id };

        RaporttiService.createRaportti('Loyto_kuntoraportti', report).then(function success(data) {
          AlertService.showInfo(locale.getString('common.Report_request_created'));
          vm.close();
        }, function error(data) {
          AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
        });
      };

      vm.lisaaKuva = function () {
        ModalService.arkImageUploadModal("kuntoraportti", vm.kuntoraportti, false, vm.tutkimus.id);
      }

      vm.otherImages = [];
      vm.getOtherImages = function () {
        if (vm.kuntoraportti.properties.id) {
          FileService.getArkImages({
            'jarjestys': 'ark_kuva.id',
            'jarjestys_suunta': 'nouseva',
            'rivit': 1000,
            'ark_tutkimus_id': vm.tutkimus.id,
            'ark_kuntoraportti_id': vm.kuntoraportti.properties.id,
            'luetteloitu': false
          }).then(function success(images) {
            vm.otherImages = images.features;
            // Kuvien määrä (directives.js)
            $scope.kuvia_kpl = vm.images.length;
          }, function error(data) {
            locale.ready('error').then(function () {
              AlertService.showError(locale.getString("error.Getting_images_failed"), AlertService.message(data));
            });
          });
        }
      };
      vm.getOtherImages();

      vm.openImage = function (image) {
        ModalService.arkImageModal(image, 'kuntoraportti', vm.kuntoraportti, vm.permissions, vm.images, null);
      };
      /*
			 * Images were modified, fetch them again
			 */
			$scope.$on('arkKuva_modified', function (event, data) {
				vm.getOtherImages();
      });

      /*
       * Create a report
       * type: PDF / WORD / EXCEL ...
       */
      vm.createReport = function (type) {
        //Asetetaan raportin "nimi" joka näkyy mm. raportit-välilehdellä
        //Raportin nimi + löydön luettelointinumero
        var reportDisplayName = locale.getString('ark.Condition_report') + " " + vm.loyto.luettelointinumero;

        var report = {
          'requestedOutputType': type,
          'reportDisplayName': reportDisplayName,
          'kuntoraporttiId': vm.kuntoraportti.properties.id,
          'konservaattori': $scope.userRole = UserService.getProperties().user.etunimi + " " + UserService.getProperties().user.sukunimi};

        RaporttiService.createRaportti('Kuntoraportti', report).then(function success(data) {
          AlertService.showInfo(locale.getString('common.Report_request_created'));
          vm.close();
        }, function error(data) {
          AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
        });
      };

      /**
       * Taulukon kolumnien tekstien haku
       */
      vm.getColumnName = function (column, lang_file) {
        var str;

        if (lang_file) {
          str = lang_file + '.' + column;
        } else {
          str = 'common.' + column;
        }

        return locale.getString(str);
      }
    }
  ]);
