/*
 * Löydön kuntoraportin luontinäkymä
 */
// eslint-disable-next-line angular/function-type
angular.module('mip.tutkimus').controller(
  'ArkTutkimusraporttiController',
  [
    '$scope', '$rootScope', 'AlertService', 'locale', 'LoytoService', 'FileService', 'permissions', 'UserService', 'TutkimusService',
    'selectedModalNameId', 'ModalControllerService', 'tutkimusraportti', 'RaporttiService', 'tutkimus', 'ModalService', '$filter','CONFIG',
    function ($scope, $rootScope, AlertService, locale, LoytoService, FileService, permissions, UserService, TutkimusService,
      selectedModalNameId, ModalControllerService, tutkimusraportti, RaporttiService, tutkimus, ModalService, $filter, CONFIG) {
      var vm = this;

      /**
       * Controllerin set-up.
       */
      vm.setUp = function () {
        angular.extend(vm, ModalControllerService);

        // Valitun modalin nimi ja järjestysnumero
        vm.modalNameId = selectedModalNameId;
        vm.setModalId();

        vm.tutkimusraportti = tutkimusraportti;
        vm.tutkimus = tutkimus;

        vm.create = vm.tutkimusraportti.properties.id == null;
        vm.edit = vm.create === true;

        vm.permissions = permissions;
        vm.entity = 'tutkimusraportti';

        if (vm.create) {
          vm.muodostaArkistoJaRekisteritiedot();
        }
      };

      vm.muodostaArkistoJaRekisteritiedot = function () {
        // Muodostetaan arkisto ja rekisteritiedot, jos ne ovat tyhjät
        if (vm.tutkimusraportti.properties.arkisto_ja_rekisteritiedot && vm.tutkimusraportti.properties.arkisto_ja_rekisteritiedot.length > 0) {
          return;
        }
        // Kaivais, Koekaivaus, Konekaivuun valvonta
        TutkimusService.getTutkimuksenLukumaarat(tutkimus.id).then(function success(data) {
          if (vm.tutkimus.ark_tutkimuslaji_id === 5) {
            // Inventointiraportti
            vm.muodostaInventointiraportinTeksti(data.properties.digikuvatAlku, data.properties.digikuvatLoppu);
          } else if (vm.tutkimus.ark_tutkimuslaji_id === 7 || vm.tutkimus.ark_tutkimuslaji_id === 10 || vm.tutkimus.ark_tutkimuslaji_id === 12) {
            vm.muodostaKKKVraportinTeksti(data.properties.loydotCount, data.properties.naytteetCount, data.properties.digikuvatAlku, data.properties.digikuvatLoppu);
          }
        }, function error(data) {
          if (vm.tutkimus.ark_tutkimuslaji_id === 5) {
            // Inventointiraportti
            vm.muodostaInventointiraportinTeksti();
            AlertService.showError('Digikuvien määriä ei saatu noudettua');
          } else if (vm.tutkimus.ark_tutkimuslaji_id === 7 || vm.tutkimus.ark_tutkimuslaji_id === 10 || vm.tutkimus.ark_tutkimuslaji_id === 12) {
            vm.muodostaKKKVraportinTeksti();
            AlertService.showError('Löytöjen, näytteiden ja digikuvien määriä ei saatu noudettua');
          }
        });
      };

      vm.muodostaKKKVraportinTeksti = function (loytojenLkm, naytteidenLkm, digikuvatAlku, digikuvatLoppu) {
        if (!loytojenLkm) {
          loytojenLkm = '';
        }
        if (!naytteidenLkm) {
          naytteidenLkm = '';
        }
        if (!digikuvatAlku) {
          digikuvatAlku = '';
        }
        if (!digikuvatLoppu) {
          digikuvatLoppu = '';
        }

        var text = 'Tutkimuskohde: ';
        // Tutkimuskohde: Kunta kohteen tiedoista Kohde Tutkimuksen nimi
        text += vm.tutkimus.kohde_kunta != null ? vm.tutkimus.kohde_kunta.nimi + '; ' : '';
        text += vm.tutkimus.kohde != null ? vm.tutkimus.kohde.nimi + '; ' : '';
        text += vm.tutkimus.nimi + '\n';
        // Kylä / Kaupunginosa: Kylä kohteen tiedoista
        text += 'Kylä / kaupunginosa: ';
        text += vm.tutkimus.kohde_kyla != null ? vm.tutkimus.kohde_kyla.nimi + '\n' : '\n';
        // Tila / kortteli - vapaateksti
        text += 'Tila / kortteli: \n';
        // Tontti - vapaateksti
        text += 'Tontti: \n';
        // Kiinteistöt - haetaan kohteen kiinteistotunnukset, jos ei ole jätetään pois
        if (vm.tutkimus.kohde && vm.tutkimus.kohde.kiinteistotrakennukset) {
          text += 'Kiinteistöt: ';
          if(vm.tutkimus.kohde.kiinteistotrakennukset && vm.tutkimus.kohde.kiinteistotrakennukset.length > 0) {
            for (var i = 0; i < vm.tutkimus.kohde.kiinteistotrakennukset.length; i++) {
              text += vm.tutkimus.kohde.kiinteistotrakennukset[i].kiinteistotunnus;
              if (i < vm.tutkimus.kohde.kiinteistotrakennukset.length - 1) {
                text += ', ';
              } else if (i === vm.tutkimus.kohde.kiinteistotrakennukset.length - 1) {
                text += '\n';
              }
            }
          } else {
            text += '\n';
          }
        }
        // Tutkimuksen laatu - tutkimustyyppi
        text += 'Tutkimuksen laatu: ';
        text += vm.tutkimus.tutkimuslaji != null ? vm.tutkimus.tutkimuslaji.nimi_fi + '\n' : '\n';
        // Kohteen ajoitus - vapaateksti
        text += 'Kohteen ajoitus: \n';
        if (CONFIG.ORGANISATION === 'Turun museokeskus') {
          // Koordinaatit GK23 - vapaateksti
          text += 'Koordinaatit Turun kaupungin ETRS-GK23-järjestelmässä: \n';
        }
        // Koordinaatit TM35FIN - vapaateksti
        text += 'Koordinaatit ETRS-TM35FIN-järjestelmässä: \n';
        // Korkeusjarjestelma - vapaateksti
        text += 'Korkeusjärjestelmä: \n';
        // Tutkimuslaitos - vapaateksti
        text += 'Tutkimuslaitos: \n';
        // Kenttätyöjohtaja
        text += 'Kenttätyöjohtaja: ';
        text += vm.tutkimus.kenttatyojohtaja != null ? vm.tutkimus.kenttatyojohtaja + '\n' : '\n';
        // Muut työntekijät - vapaateksti
        text += 'Muut työntekijät: \n';
        // Konservointilaitos - vapaateksti
        text += 'Konservointilaitos: \n';
        // Kenttätyöaika
        text += 'Kenttätyöaika: ' + $filter('date')(vm.tutkimus.kenttatyo_alkupvm, 'dd.MM.yyyy') + ' - ' + $filter('date')(vm.tutkimus.kenttatyo_loppupvm, 'dd.MM.yyyy') + '\n';
        // Tutkitun alueen pinta-ala - vapaateksti
        text += 'Tutkitun alueen pinta-ala: \n';
        // Tutkimuksen tilaaja / rahoittaja - rahoittaja
        text += 'Tutkimuksen tilaaja / rahoittaja: ';
        text += vm.tutkimus.rahoittaja != null ? vm.tutkimus.rahoittaja + '\n' : '\n';
        // Tutkimusluvan diariointinumero ja päivämäärä - vapaateksti
        text += 'Tutkimusluvan diariointinumero ja päivämäärä: \n';
        // Löytöjen säilytyspaikka
        text += 'Löytöjen säilytyspaikka: ';
        text += vm.tutkimus.loyto_kokoelmalaji != null ? vm.tutkimus.loyto_kokoelmalaji.nimi_fi + '\n' : '\n';
        // Löytöjen päänumero
        text += 'Löytöjen päänumero: ';
        text += vm.tutkimus.loyto_paanumero != null ? vm.tutkimus.loyto_paanumero + '; ' + loytojenLkm + ' kpl \n' : '\n';
        // Näytteiden päänumero
        text += 'Näytteiden päänumero: ';
        text += vm.tutkimus.nayte_paanumero != null ? vm.tutkimus.nayte_paanumero + '; ' + naytteidenLkm + ' kpl \n' : '\n';
        // Digikuvien päänumero
        text += 'Digikuvien päänumero: ';
        text += vm.tutkimus.digikuva_paanumero != null ? vm.tutkimus.digikuva_paanumero + '; ' + digikuvatAlku + ' - ' + digikuvatLoppu + ' \n' : '\n';
        // KM-päänumero ja löytöjen diariointipäivämäärät
        text += 'KM päänumerot ja löytöjen diariointipäivämäärät: ';
        text += vm.tutkimus.km_paanumerot_ja_diaarnum != null ? vm.tutkimus.km_paanumerot_ja_diaarnum + '\n' : '\n';
        // Aikaisemmat tutkimukset ja tarkastuskäynnit - vapaateksti
        text += 'Aikaisemmat tutkimukset ja tarkastuskäynnit: \n';
        // Aikaisemmat löydöt - vapaateksti
        text += 'Aikaisemmat löydöt: \n';
        // Alkuperäisen tutkimuskertomuksen säilytyspaikka - Museoviraston arkisto
        text += 'Alkuperäisen tutkimuskertomuksen säilytyspaikka: Museoviraston arkisto \n';
        // Kopioiden säilytyspaikka - vapaateksti
        text += 'Kopioiden säilytyspaikka: ';

        vm.tutkimusraportti.properties.arkisto_ja_rekisteritiedot = text;
      };

      vm.muodostaInventointiraportinTeksti = function (digikuvatAlku, digikuvatLoppu) {
        if (!digikuvatAlku) {
          digikuvatAlku = '';
        }
        if (!digikuvatLoppu) {
          digikuvatLoppu = '';
        }

        var text = 'Tutkimuskohde: ';
        // Tutkimuskohde: Kunta Tutkimuksen nimi
        if (vm.tutkimus.kunnatkylat != null && vm.tutkimus.kunnatkylat.length > 0) {
          for (var i = 0; i < vm.tutkimus.kunnatkylat.length; i++) {
            if (vm.tutkimus.kunnatkylat[i].kunta != null) {
              // 11262 Lisätään kunta ainoastaan jos sitä ei ole jo tekstissä.
              if (text.indexOf(vm.tutkimus.kunnatkylat[i].kunta.nimi) === -1) {
                text += vm.tutkimus.kunnatkylat[i].kunta.nimi + ', ';
              }
            }
          }
          text = text.slice(0, -2);
          text += '; ';
        }
        text += vm.tutkimus.nimi + '\n';
        // Kylä / Kaupunginosa: Kylä
        text += 'Kylä / kaupunginosa: ';
        if (vm.tutkimus.kunnatkylat != null && vm.tutkimus.kunnatkylat.length > 0) {
          for (var i = 0; i < vm.tutkimus.kunnatkylat.length; i++) {
            if (vm.tutkimus.kunnatkylat[i].kyla != null) {
              text += vm.tutkimus.kunnatkylat[i].kyla.nimi + ', ';
            }
          }
          text = text.slice(0, -2);
          text += '\n';
        } else {
          text += '\n';
        }
        // Tila / kortteli - vapaateksti
        text += 'Tila / kortteli: \n';
        // Tontti - vapaateksti
        text += 'Tontti: \n';
        // Tutkimuksen laatu - tutkimustyyppi
        text += 'Tutkimuksen laatu: ';
        text += vm.tutkimus.tutkimuslaji != null ? vm.tutkimus.tutkimuslaji.nimi_fi + '\n' : '\n';
        if (CONFIG.ORGANISATION === 'Turun museokeskus') {
          // Koordinaatit GK23 - vapaateksti
          text += 'Koordinaatit Turun kaupungin ETRS-GK23-järjestelmässä: \n';
        }
        // Koordinaatit TM35FIN - vapaateksti
        text += 'Koordinaatit ETRS-TM35FIN-järjestelmässä: \n';
        // Korkeusjarjestelma - vapaateksti
        text += 'Korkeusjärjestelmä: \n';
        // Tutkimuslaitos - vapaateksti
        text += 'Tutkimuslaitos: \n';
        // Kenttätyöjohtaja
        text += 'Kenttätyöjohtaja: ';
        text += vm.tutkimus.kenttatyojohtaja != null ? vm.tutkimus.kenttatyojohtaja + '\n' : '\n';
        // Muut työntekijät - vapaateksti
        text += 'Muut työntekijät: \n';
        // Konservointilaitos - vapaateksti
        text += 'Konservointilaitos: \n';
        // Kenttätyöaika
        text += 'Kenttätyöaika: ' + $filter('date')(vm.tutkimus.alkupvm, 'dd.MM.yyyy') + ' - ' + $filter('date')(vm.tutkimus.loppupvm, 'dd.MM.yyyy') + '\n';
        // Inventointialueen pinta-ala - vapaateksti
        text += 'Inventointialueen pinta-ala: \n';
        // Tutkimuksen tilaaja / rahoittaja - rahoittaja
        text += 'Tutkimuksen tilaaja / rahoittaja: ';
        text += vm.tutkimus.toimeksiantaja != null ? vm.tutkimus.toimeksiantaja + '\n' : '\n';
        // Tutkimusluvan diariointinumero ja päivämäärä - vapaateksti
        text += 'Tutkimusluvan diariointinumero ja päivämäärä: \n';
        // Löytöjen säilytyspaikka
        text += 'Löytöjen säilytyspaikka: ';
        text += vm.tutkimus.loyto_kokoelmalaji != null ? vm.tutkimus.loyto_kokoelmalaji.nimi_fi + '\n' : '\n';
        // KM päänumerot ja löytöjen diariointipäivämäärät
        text += 'KM päänumerot ja löytöjen diariointipäivämäärät: ';
        text += vm.tutkimus.km_paanumerot_ja_diaarnum != null ? vm.tutkimus.km_paanumerot_ja_diaarnum + '\n' : '\n';
        // Digikuvien päänumero
        text += 'Digikuvien päänumero: ';
        text += vm.tutkimus.digikuva_paanumero != null ? vm.tutkimus.digikuva_paanumero + '; ' + digikuvatAlku + ' - ' + digikuvatLoppu + ' \n' : '\n';
        // Aikaisemmat tutkimukset ja tarkastuskäynnit - vapaateksti
        text += 'Aikaisemmat tutkimukset ja tarkastuskäynnit: \n';
        // Aikaisemmat löydöt - vapaateksti
        text += 'Aikaisemmat löydöt: \n';
        // Alkuperäisen tutkimuskertomuksen säilytyspaikka - Museoviraston arkisto
        text += 'Alkuperäisen tutkimuskertomuksen säilytyspaikka: Museoviraston arkisto \n';
        // Kopioiden säilytyspaikka - vapaateksti
        text += 'Kopioiden säilytyspaikka: ';

        vm.tutkimusraportti.properties.arkisto_ja_rekisteritiedot = text;
      };

      vm.setUp();

      /**
       * Sulkemisruksi.
       */
      // eslint-disable-next-line angular/controller-as
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

      vm._editMode = function () {
        vm.original = angular.copy(vm.tutkimusraportti);
        vm.muodostaArkistoJaRekisteritiedot();
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

          AlertService.showInfo(locale.getString('common.Save_ok'), '');

          vm.disableButtonsFunc();

          // Katselutila päälle
          vm.edit = false;
          vm.create = false;

          $rootScope.$broadcast('Tutkimus_update', {
            tutkimusId: vm.tutkimus.id
          });
        }, function error() {
          AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
          vm.disableButtonsFunc();
        });
      };

      vm.deleteTutkimusraportti = function () {
        var conf = confirm(locale.getString('common.Confirm_delete2', { item: 'Tutkimusraportti ' + vm.tutkimusraportti.properties.id }));
        if (conf) {
          TutkimusService.poistaTutkimusraportti(vm.tutkimusraportti.properties.id).then(function () {
            vm.close();

            locale.ready('ark').then(function () {
              AlertService.showInfo(locale.getString('ark.Research_report_deleted'));
            });
          }, function error(data) {
            locale.ready('error').then(function () {
              AlertService.showError(locale.getString('error.Delete_report_failed'), AlertService.message(data));
            });
          });
        }
      };

      /*
       * Create a report
       * type: PDF / WORD / EXCEL ...
       */
      vm.createReport = function (type) {
        // Asetetaan raportin "nimi" joka näkyy mm. raportit-välilehdellä
        // Raportin nimi + löydön luettelointinumero
        var reportDisplayName = locale.getString('ark.Research_report') + ' ' + vm.tutkimus.nimi;

        var laji = null;
        if (vm.tutkimus.ark_tutkimuslaji_id === 5) {
          laji = 'inventointitutkimus';
        } else if (vm.tutkimus.ark_tutkimuslaji_id === 7 || vm.tutkimus.ark_tutkimuslaji_id === 10 || vm.tutkimus.ark_tutkimuslaji_id === 12) {
          laji = 'koekaivaus-kaivaus-konekaivuun_valvonta';
        }

        if (laji === null) {
          AlertService.showError(locale.getString('ark.Unknown_report_type'));
          return;
        }

        var report = {
          requestedOutputType: type,
          reportDisplayName: reportDisplayName,
          tutkimusraporttiId: vm.tutkimusraportti.properties.id,
          laji: laji
        };

        RaporttiService.createRaportti('Tutkimusraportti', report).then(function success(data) {
          AlertService.showInfo(locale.getString('common.Report_request_created'));
          vm.close();
        }, function error(data) {
          AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
        });
      };

      /*
       * Avaa valittu kuva, välitetään kuvien lista.
       */
      vm.openImage = function (image) {
        ModalService.arkImageModal({ properties: image }, 'tutkimusraportti', vm.tutkimusraportti, vm.permissions, [{ properties: image }], vm.tutkimus.id);
      };
    }
  ]);
