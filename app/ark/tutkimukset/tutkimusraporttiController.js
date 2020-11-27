/*
 * Löydön kuntoraportin luontinäkymä
 */
angular.module('mip.tutkimus').controller(
  'ArkTutkimusraporttiController',
  [
    '$scope', '$rootScope', 'AlertService', 'locale', 'LoytoService', 'FileService', 'permissions', 'UserService', 'TutkimusService',
    'selectedModalNameId', 'ModalControllerService', 'tutkimusraportti', 'RaporttiService', 'tutkimus', 'ModalService',
    function ($scope, $rootScope, AlertService, locale, LoytoService, FileService, permissions, UserService, TutkimusService,
      selectedModalNameId, ModalControllerService, tutkimusraportti, RaporttiService, tutkimus, ModalService) {

      var vm = this;

      /**
       * Controllerin set-up.
       */
      vm.setUp = function () {

        angular.extend(vm, ModalControllerService);

        // Valitun modalin nimi ja järjestysnumero
        vm.modalNameId = selectedModalNameId;
        vm.setModalId();

        vm.tutkimus = tutkimus;

        vm.create = vm.tutkimusraportti.properties.id == null ? true : false;
        vm.edit = vm.create == true ? true : false;

        vm.permissions = permissions;
        vm.entity = 'tutkimusraportti';
      };

      vm.haeTutkimusraportti = function () {
        if (tutkimusraportti.properties.id) {
          TutkimusService.haeTutkimusraportti(tutkimusraportti.properties.id).then(function success(data) {
            vm.tutkimusraportti = data;

            vm.muodostaArkistoJaRekisteritiedot();

            vm.setUp();
          });
        } else {
          vm.tutkimusraportti = tutkimusraportti;
        }
      }
      vm.haeTutkimusraportti();

      vm.muodostaArkistoJaRekisteritiedot = function () {
        // Muodostetaan arkisto ja rekisteritiedot, jos ne ovat tyhjät
        if (vm.tutkimusraportti.properties.arkisto_ja_rekisteritiedot.length > 0) {
          console.log("TODO: Arkisto ja rekisteritietojen muodostaminen");
        }
      }

      /**
       * Sulkemisruksi.
       */
      $scope.close = function () {
        vm.close();
        $scope.$destroy();
      };

      vm._cancelEdit = function () {
        // TODO: Kuvien asettaminen alkutilaan!
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
        vm.tutkimusraportti.properties.ark_tutkimus_id = vm.tutkimus.id;
        vm.disableButtons = true;

        TutkimusService.luoTallennaTutkimusraportti(vm.tutkimusraportti).then(function (data) {
          vm.tutkimusraportti.properties.id = data.properties.id;
          vm.original = angular.copy(vm.tutkimusraportti);

          AlertService.showInfo(locale.getString('common.Save_ok'), "");

          vm.disableButtonsFunc();

          // Katselutila päälle
          vm.edit = false;
          vm.create = false;

          $rootScope.$broadcast('Tutkimus_update', {
            'tutkimusId': vm.tutkimus.id
          });

        }, function error() {
          AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
          vm.disableButtonsFunc();
        });
      }

      vm.deleteTutkimusraportti = function () {
        var conf = confirm(locale.getString('common.Confirm_delete2', { 'item': 'Tutkimusraportti ' + vm.tutkimusraportti.properties.id }));
        if (conf) {
          TutkimusService.poistaTutkimusraportti(vm.tutkimusraportti.properties.id).then(function () {
            vm.close();

            locale.ready('ark').then(function () {
              AlertService.showInfo(locale.getString('ark.Research_report_deleted'));
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
        var reportDisplayName = locale.getString('ark.Research_report') + " " + vm.tutkimus.nimi;

        var report = {
          'requestedOutputType': type,
          'reportDisplayName': reportDisplayName,
          'tutkimusraporttiId': vm.tutkimusraportti.properties.id,
          'laji': 'koekaivaus-kaivaus-konekaivuun_valvonta'
        };

        RaporttiService.createRaportti('Tutkimusraportti', report).then(function success(data) {
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
