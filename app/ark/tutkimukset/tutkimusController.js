/*
 * Tutkimus UI controller
 */
// eslint-disable-next-line angular/function-type
angular.module('mip.tutkimus').controller(
  'TutkimusController',
  [
    '$scope', '$rootScope', 'TabService', '$location', '$filter', 'TutkimusService',
    'CONFIG', 'existing', 'AlertService', 'ModalService', 'ListService', 'locale',
    'tutkimus', 'olData', 'hotkeys', 'MapService', '$timeout', 'KuntaService',
    'UserService', 'NgTableParams', 'YksikkoService', '$popover', 'permissions',
    'selectedModalNameId', 'ModalControllerService', 'kohde', 'MuutoshistoriaService',
    'TutkimusalueService', 'KiinteistoService', 'EntityBrowserService', 'subPermissions',
    'RaporttiService', 'FileService', 'KarttaService', 'KohdeService', 'LocationService',
    function ($scope, $rootScope, TabService, $location, $filter, TutkimusService,
      CONFIG, existing, AlertService, ModalService, ListService, locale,
      tutkimus, olData, hotkeys, MapService, $timeout, KuntaService,
      UserService, NgTableParams, YksikkoService, $popover, permissions,
      selectedModalNameId, ModalControllerService, kohde, MuutoshistoriaService,
      TutkimusalueService, KiinteistoService, EntityBrowserService, subPermissions,
      RaporttiService, FileService, KarttaService, KohdeService, LocationService) {
      var vm = this;

      /**
       * Controllerin set-up. Suoritetaan ainoastaan kerran.
       */
      vm.setUp = function () {
        angular.extend(vm, ModalControllerService);

        // Valitun modalin nimi ja järjestysnumero
        vm.modalNameId = selectedModalNameId;
        vm.setModalId();
        vm.entity = 'tutkimus';
        vm.setMapId(vm.entity);
        vm.setMapPopupId();

        vm.invKohteet = [];

        vm.kayttajaArkRooli = UserService.getProperties().user.ark_rooli;

        // Valittu tutkimus
        if (tutkimus) {
          vm.tutkimus = tutkimus;

          // Inventointi-tutkimukselle näytetään kohteet.
          if (vm.tutkimus.properties.tutkimuslaji.id === 5 && vm.tutkimus.properties.inventointiKohteet) {
            vm.invKohteet = vm.tutkimus.properties.inventointiKohteet;
          }
        } else {
          /*
           * Uusi tutkimus. Asetetaan oletukset ja kohteelta saadut tiedot.
           */
          var kohde_id = '';
          var kohde_nimi = '';
          var kohde_kunta = '';
          var kohde_kyla = '';
          var kohde_kiinteistotrakennukset = [];

          if (kohde != null) {
            kohde_id = kohde.properties.id;
            kohde_nimi = kohde.properties.nimi;
            if (kohde.properties.kunnatkylat.length > 0 && kohde.properties.kunnatkylat[0].kunta) {
              kohde_kunta = kohde.properties.kunnatkylat[0].kunta;
            }
            if (kohde.properties.kunnatkylat.length > 0 && kohde.properties.kunnatkylat[0].kyla) {
              kohde_kyla = kohde.properties.kunnatkylat[0].kyla;
            }
            kohde_kiinteistotrakennukset = kohde.properties.kiinteistotrakennukset;
          }

          // Oletus tarkastajaksi käyttäjä. Tarvitaan tarkastustutkimuksilla.
          var kayttaja = UserService.getProperties();
          var tarkastus = { 'tarkastaja': kayttaja.user };
          vm.tutkimus = {
            'properties': {
              'julkinen': vm.noYes[0].value,
              'valmis': vm.noYes[0].value,
              'kohde_id': kohde_id,
              'kohde_nimi': kohde_nimi,
              'kohde_kunta': kohde_kunta,
              'kohde_kyla': kohde_kyla,
              'kiinteistotrakennukset': kohde_kiinteistotrakennukset,
              'tutkimusalueet': [],
              'tutkimuskayttajat': [],
              'kunnatkylat': [],
              'tarkastus': tarkastus
            }
          };
        }

        // Uusi tai olemassa oleva tutkimus
        if (!existing) {
          vm.edit = true;
          vm.create = true;
        }

        // Oikeudet itse tutkimukseen
        vm.permissions = permissions;

        // Käyttäjällä on oikeudet muokata tutkimukseen liittyviä asioita, jos hän on
        // 1) Pääkäyttäjä
        // 2) Tutkija
        // 3) Katselija JA tutkimusta ei ole merkitty valmiiksi JA kyseessä ei ole inventointitutkimus
        // Alla olevia oikeuksia käytetään hallinnoimaan käyttöliittymässä näytettäviä painikkeita
        vm.editRelatedPermissions = subPermissions;

        // Tutkimuksen kohde. Uusi tutkimus liitetty kohteeseen.
        if (kohde) {
          vm.tutkimusKohde = kohde;
        }

        vm.center = {
          lat: null,
          lon: null,
          autodiscover: false,
          bounds: []
        };

        // all possible layers; shown in dropdown button
        vm.objectLayers = [
          {
            "value": "Tutkimusalueet",
            "label": locale.getString('ark.Research_areas')
          },
          {
            "value": "Kohteet",
            "label": locale.getString('ark.Targets')
          }
        ];
        // Ainoastaan inventointitutkimukselle ja tarkastustutkimukselle näytetään reittitaso
        if (vm.tutkimus && vm.tutkimus.properties && (vm.tutkimus.properties.ark_tutkimuslaji_id == 5 || vm.tutkimus.properties.ark_tutkimuslaji_id == 11)) {
          locale.ready('map').then(function () {
            vm.objectLayers.push({ "value": "Reitit", "label": locale.getString('map.Routes') });
          });
        }
        /*
         * Array for holding all of the visible layers we have for the map
         */
        vm.mapLayers = [];
        vm.selectedMapLayers = [];

        // layers selected for showing; note, vm.mapLayers holds
        // the "real" layers that are
        // drawn on the map; these are object (feature) layers
        vm.selectedLayers = [];

        vm.extent = null;

        /**
         * Extendataan kartta (MapService.map() palauttama map) viewmodeliin
         */
        angular.extend(vm, MapService.map(vm.mapLayers));

        /*
         * Ladataan kartta
         */
        olData.getMap(vm.mapId).then(function (map) {
          vm.map = map;

          vm.getAvailableMapLayers(true);

          vm.selectDefaultObjectLayers();

          /**
           * Keskitetään kartta
           */
          vm.centerToExtent(vm.tutkimus.properties.tutkimusalueet);
        });

        // eslint-disable-next-line angular/controller-as
        $scope.focusInput = false;

        vm.ladattuKohde = null;
        if (vm.tutkimus.properties.kohde && vm.tutkimus.properties.kohde.id) {
          KohdeService.fetchKohde(vm.tutkimus.properties.kohde.id).then(function (kohde) {
            vm.ladattuKohde = kohde;
            vm.centerToExtent(vm.ladattuKohde.properties.sijainnit);
            vm.updateLayerData('Kohteet');
          });
        }

        // Käytetään kuvien hakemisessa - jos arvo on asetettu, ei haeta kaikkien tutkimukseen liittyvien
        // entiteettien kuvia, ainoastaan näytteiden, löytöjen, yksiköiden ja tutkimusalueiden.
        vm.tutkimus_view = true;
      };
      vm.setUp();

      /*
      * Lisätään label tutkimusalueelle. Label on juokseva numero ja näytetään kartalla tutkimusalueen keskellä.
      */
      vm.addLabelToTutkimusalue = function (ta) {
        if (ta.properties.nimi) {
          ta.properties.label = ta.properties.nimi;
        }
      };

      /*
       * Lisää/päivitä tutkimusalueiden labelit
       */
      vm.updateTutkimusalueLabels = function () {
        for (var i = 0; i < vm.tutkimus.properties.tutkimusalueet.length; i++) {
          var ta = vm.tutkimus.properties.tutkimusalueet[i];
          vm.addLabelToTutkimusalue(ta);
        }
      };
      vm.updateTutkimusalueLabels();

      /**
       * Kiinteistön haku kiinteistötunnuksella
       */
      vm.showKiinteistoModal = function (kiinteistotunnus) {
        KiinteistoService.haeKiinteistotunnuksella(kiinteistotunnus).then(function (kiinteisto) {
          EntityBrowserService.setQuery('kiinteisto', kiinteisto.properties.id, { 'rakennus_id': kiinteisto.properties.id }, 1);
          ModalService.kiinteistoModal(kiinteisto, null);
        }, function error(data) {
          locale.ready('building').then(function () {
            AlertService.showError(locale.getString('error.Getting_estate_details_failed'), AlertService.message(data));
          });
        });
      };

      /**
       * Keskitetään kartta. Pitää olla timeoutin sisällä, muuten ei vaikutusta
       * @param data = array joka sisältää featureja. Eli jos on ainoastaan yksi johon keskitetään, annetaan sisään [vm.kohde]
       */
      vm.centerToExtent = function (data) {
        if (data && data.length > 0) {
          $timeout(function () {
            var taExtent = MapService.calculateExtentOfFeatures(data);

            var oldExtent = angular.copy(vm.extent);
            vm.extent = MapService.getBiggestExtent(vm.extent, taExtent);

            if (oldExtent !== vm.extent) {
              MapService.centerToExtent(vm.map, vm.extent);
            }
          });
        }
      }

      // Roolien alustus
      vm.omistaja = false;
      vm.tutkija = false;
      vm.katselija = false;

      /**
       * ModalHeader kutsuu scopesta closea
       */
      // eslint-disable-next-line angular/controller-as
      $scope.close = function () {
        vm.close();
        $scope.$destroy();
      };

      /**
       * Peruuta muokkaus
       */
      vm._cancelEdit = function () {
        vm.updateTutkimusalueLabels();
        vm.updateLayerData('Tutkimusalueet');
        vm.edit = false;
        /*
         * Ladataan kartta - ng-if (ja ng-show) säätäminen
         * hukkaa kartan ja palauttaa eri kartan. Liitetään se takaisin
         * modeliin.
         */
        olData.getMap(vm.mapId).then(function (map) {
          vm.map = map;

          vm.getAvailableMapLayers(true);

          vm.selectDefaultObjectLayers();
        });
        vm.tutkimus = angular.copy(vm.original);
      };

      /**
       * Readonly / edit mode - additional steps
       */
      vm._editMode = function () {
        // Tallennetaan alkuperäinen mahdollisen peruuttamisen vuoksi
        vm.original = angular.copy(vm.tutkimus);
        // eslint-disable-next-line angular/controller-as
        $scope.focusInput = true;
        $scope.$broadcast('focusInput');
      };

      // Kenttätyöjohtaja syötettävissä vain tutkimuksille: kaivaus, koekaivaus ja konekaivuun valvonnalle
      vm.naytaKenttaJohtaja = function () {
        if (vm.tutkimus.properties.tutkimuslaji.id === 7 || vm.tutkimus.properties.tutkimuslaji.id === 10 ||
          vm.tutkimus.properties.tutkimuslaji.id === 12) {
          return true;
        } else {
          return false;
        }
      };

      /**
       * Tallenna tutkimus
       */
      vm.save = function () {
        vm.disableButtonsFunc();

        /*
         * Vain tarkastustutkimuksella on tarkastustiedot.
         * Uuden tutkimuksen lisäyksessä asetetaan aina tarkastaja, joka poistetaan jos ei luoda tarkastustutkimusta.
         */
        if (vm.tutkimus.properties.tutkimuslaji.id !== 11) {
          vm.tutkimus.properties.tarkastus = null;
        }

        var count = 0;
        TutkimusService.tallennaTutkimus(vm.tutkimus).then(function (id) {
          if (vm.create) {
            vm.tutkimus.properties["id"] = id;
            vm.create = false;
          }
          vm.edit = false;

          // Haetaan tutkimus jotta saadaan kaikki liittyvät kamat paikoilleen
          TutkimusService.haeTutkimus(vm.tutkimus.properties.id).then(function (tutkimus) {
            vm.tutkimus = tutkimus;
            // "update" the original after successful save
            vm.original = angular.copy(vm.tutkimus);

            EntityBrowserService.setQuery('tutkimus', vm.tutkimus.properties.id, { 'tutkimus_id': vm.tutkimus.properties.id }, 1);

            if (vm.tutkimus.properties.kohde && vm.tutkimus.properties.kohde.id) {
              KohdeService.fetchKohde(vm.tutkimus.properties.kohde.id).then(function (kohde) {
                vm.ladattuKohde = kohde;
                var naytaKohdeTaso = true;
                for (var i = 0; i < vm.selectedLayers.length; i++) {
                  if (vm.selectedLayers[i] == 'Kohteet') {
                    naytaKohdeTaso = false;
                  }
                }
                if (naytaKohdeTaso) {
                  vm.selectDefaultObjectLayers();
                }
                vm.updateLayerData('Kohteet');
                vm.centerToExtent(vm.ladattuKohde.properties.sijainnit);
              });
            }
          });

          vm.disableButtonsFunc();
          AlertService.showInfo(locale.getString('common.Save_ok'), "");
        }, function error() {
          AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
          vm.disableButtonsFunc();
        });
      };

      /**
       * Nimen tarkistus, oltava uniikki
       */
      vm.uniikkiNimi = true;
      vm.tarkistaNimi = function (form) {
        var available = TutkimusService.tarkistaNimi(vm.tutkimus.properties.nimi).then(function success(data) {
          if (data) {
            form.nimi.$setValidity('kaytossa', true);
            vm.uniikkiNimi = true;
          } else {
            form.nimi.$setValidity('kaytossa', false);
            vm.uniikkiNimi = false;
          }
        });
        return available;
      };

      /**
       * Tutkimuksen lyhenteen tarkistus, oltava uniikki
       */
      vm.uniikkiTutkimuksenLyhenne = true;
      vm.tarkistaTutkimuksenLyhenne = function (form) {
        var available = TutkimusService.tarkistaTutkimuksenLyhenne(vm.tutkimus.properties.tutkimuksen_lyhenne).then(function success(data) {
          if (data) {
            form.tutkimuksen_lyhenne.$setValidity('kaytossa', true);
            vm.uniikkiTutkimuksenLyhenne = true;
          } else {
            form.tutkimuksen_lyhenne.$setValidity('kaytossa', false);
            vm.uniikkiTutkimuksenLyhenne = false;
          }
        });
        return available;
      };

      /**
       * Päänumeron oltava uniikki per kokoelmatunnus,
       * Mahdolliset tyypit = loyto, nayte, digi, mustavalko, dia
       */
      vm.uniikkiLoytoPaanumero = true;
      vm.uniikkiNaytePaanumero = true;
      vm.loytoNayteSamat = true;
      vm.uniikkiDigiPaanumero = true;
      vm.validiDigiPaanumero = true;
      vm.uniikkiMustavalkoPaanumero = true;
      vm.uniikkiDiaPaanumero = true;

      vm.tarkistaPaanumero = function (form, tyyppi) {
        // Timeout lisätty $watchin takia
        // Ilman pientä timeouttia tarkastus suoritetaan ennen kuin löydön päänumeron muuttuminen on huomattu
        // ja näytteen päänumeroa ei olla irtolöydön tapauksessa vielä asetettu samaksi. Tästä johtuen formi
        // oli aina invalid koska päänumeroiden pitää olla samat kun kokoelmana on TMK.
        $timeout(function () {
          var paanumero = null;
          var kokoelmalaji = null;

          // Jos löydöllä ja näytteellä on sama kokoelmatunnus, pitää päänumeron olla molemmilla sama
          if (vm.tutkimus.properties.loyto_paanumero !== vm.tutkimus.properties.nayte_paanumero
            && vm.tutkimus.properties.loyto_kokoelmalaji && vm.tutkimus.properties.nayte_kokoelmalaji
            && vm.tutkimus.properties.loyto_kokoelmalaji.id === vm.tutkimus.properties.nayte_kokoelmalaji.id) {
            vm.loytoNayteSamat = false;
            form.loyto_paanumero.$setValidity('loytoNayteSamat', false);
          } else {
            vm.loytoNayteSamat = true;
            if (form.loyto_paanumero) { // Kaikilla tutkimuslajeilla ei tätä kenttää edes ole formilla.
              form.loyto_paanumero.$setValidity('loytoNayteSamat', true);
            }
          }

          if (tyyppi === 'loyto' && vm.tutkimus.properties.loyto_paanumero && vm.tutkimus.properties.loyto_kokoelmalaji) {
            paanumero = vm.tutkimus.properties.loyto_paanumero;
            kokoelmalaji = vm.tutkimus.properties.loyto_kokoelmalaji;

            if (paanumero && kokoelmalaji) {
              var available = TutkimusService.tarkistaPaanumero(tyyppi, paanumero, kokoelmalaji.id).then(function success(data) {
                if (form.loyto_paanumero) {
                  if (data) {
                    form.loyto_paanumero.$setValidity('kaytossa', true);
                    vm.uniikkiLoytoPaanumero = true;
                  } else {
                    form.loyto_paanumero.$setValidity('kaytossa', false);
                    vm.uniikkiLoytoPaanumero = false;
                  }
                }
              });
              return available;
            }
          }
          // Jos löydöllä ja näytteellä on eri kokoelmatunnus, tarkistetaan uniikkius
          else if (tyyppi === 'nayte' && vm.tutkimus.properties.nayte_kokoelmalaji
            && vm.tutkimus.properties.loyto_paanumero !== vm.tutkimus.properties.nayte_paanumero
            && vm.tutkimus.properties.loyto_kokoelmalaji && vm.tutkimus.properties.nayte_kokoelmalaji
            && vm.tutkimus.properties.loyto_kokoelmalaji.id !== vm.tutkimus.properties.nayte_kokoelmalaji.id) {
            paanumero = vm.tutkimus.properties.nayte_paanumero;
            kokoelmalaji = vm.tutkimus.properties.nayte_kokoelmalaji;

            if (paanumero && kokoelmalaji) {
              var available = TutkimusService.tarkistaPaanumero(tyyppi, paanumero, kokoelmalaji.id).then(function success(data) {
                if (form.nayte_paanumero) {
                  if (data) {
                    form.nayte_paanumero.$setValidity('kaytossa', true);
                    vm.uniikkiNaytePaanumero = true;
                  } else {
                    form.nayte_paanumero.$setValidity('kaytossa', false);
                    vm.uniikkiNaytePaanumero = false;
                  }
                }
              });
              return available;
            }
          } else if (tyyppi === 'digi' && vm.tutkimus.properties.valokuva_kokoelmalaji
            && vm.tutkimus.properties.digikuva_paanumero) {
            paanumero = vm.tutkimus.properties.digikuva_paanumero;
            kokoelmalaji = vm.tutkimus.properties.valokuva_kokoelmalaji;

            if (paanumero && kokoelmalaji) {
              // Digikuvan päänumerossa on oltava kaksoispiste
              if (paanumero.indexOf(':') == -1) {
                form.digikuva_paanumero.$setValidity('kaytossa', false);
                vm.validiDigiPaanumero = false;
              } else {
                form.digikuva_paanumero.$setValidity('kaytossa', true);
                vm.validiDigiPaanumero = true;

                var available = TutkimusService.tarkistaPaanumero(tyyppi, paanumero, kokoelmalaji.id).then(function success(data) {
                  if (data) {
                    form.digikuva_paanumero.$setValidity('kaytossa', true);
                    vm.uniikkiDigiPaanumero = true;
                  } else {
                    form.digikuva_paanumero.$setValidity('kaytossa', false);
                    vm.uniikkiDigiPaanumero = false;
                  }
                });
                return available;
              }
            }
          } else if (tyyppi === 'mustavalko' && vm.tutkimus.properties.valokuva_kokoelmalaji
            && vm.tutkimus.properties.mustavalko_paanumero) {
            paanumero = vm.tutkimus.properties.mustavalko_paanumero;
            kokoelmalaji = vm.tutkimus.properties.valokuva_kokoelmalaji;

            // Mustavalko ja dia ei voi olla samat
            if (vm.tutkimus.properties.mustavalko_paanumero == vm.tutkimus.properties.dia_paanumero) {
              form.mustavalko_paanumero.$setValidity('kaytossa', false);
              vm.uniikkiMustavalkoPaanumero = false;
              return false;
            }

            if (paanumero && kokoelmalaji) {
              var available = TutkimusService.tarkistaPaanumero(tyyppi, paanumero, kokoelmalaji.id).then(function success(data) {
                if (data) {
                  form.mustavalko_paanumero.$setValidity('kaytossa', true);
                  vm.uniikkiMustavalkoPaanumero = true;
                } else {
                  form.mustavalko_paanumero.$setValidity('kaytossa', false);
                  vm.uniikkiMustavalkoPaanumero = false;
                }
              });
              return available;
            }
          } else if (tyyppi === 'dia' && vm.tutkimus.properties.valokuva_kokoelmalaji
            && vm.tutkimus.properties.dia_paanumero) {
            paanumero = vm.tutkimus.properties.dia_paanumero;
            kokoelmalaji = vm.tutkimus.properties.valokuva_kokoelmalaji;

            // Mustavalko ja dia ei voi olla samat
            if (vm.tutkimus.properties.mustavalko_paanumero == vm.tutkimus.properties.dia_paanumero) {
              form.dia_paanumero.$setValidity('kaytossa', false);
              vm.uniikkiDiaPaanumero = false;
              return false;
            }

            if (paanumero && kokoelmalaji) {
              var available = TutkimusService.tarkistaPaanumero(tyyppi, paanumero, kokoelmalaji.id).then(function success(data) {
                if (data) {
                  form.dia_paanumero.$setValidity('kaytossa', true);
                  vm.uniikkiDiaPaanumero = true;
                } else {
                  form.dia_paanumero.$setValidity('kaytossa', false);
                  vm.uniikkiDiaPaanumero = false;
                }
              });
              return available;
            }
          }
        }, 100);
      };

      /**
       * Kokoelmatunnuksen vaihdon yhteydessä tarkistetaan päänumero.
       */
      vm.tarkistaKokoelmatunnus = function (kokoelma_id, form, tyyppi) {
        if (tyyppi === 'loyto') {
          if (kokoelma_id == undefined) {
            vm.tutkimus.properties.loyto_paanumero = null;
            form.loyto_paanumero.$setValidity('kaytossa', true);
            vm.uniikkiLoytoPaanumero = true;
          }
          else if (vm.tutkimus.properties.loyto_paanumero && kokoelma_id) {
            var available = TutkimusService.tarkistaPaanumero(tyyppi, vm.tutkimus.properties.loyto_paanumero, kokoelma_id).then(function success(data) {
              if (data) {
                form.loyto_paanumero.$setValidity('kaytossa', true);
                vm.uniikkiLoytoPaanumero = true;
              } else {
                form.loyto_paanumero.$setValidity('kaytossa', false);
                vm.uniikkiLoytoPaanumero = false;
              }
            });
            return available;
          }
        }

        if (tyyppi === 'nayte') {
          if (kokoelma_id == undefined) {
            vm.tutkimus.properties.nayte_paanumero = null;
            form.nayte_paanumero.$setValidity('kaytossa', true);
            vm.uniikkiNaytePaanumero = true;
          }
          else if (vm.tutkimus.properties.nayte_paanumero
            && vm.tutkimus.properties.loyto_paanumero !== vm.tutkimus.properties.nayte_paanumero
            && vm.tutkimus.properties.loyto_kokoelmalaji.id !== kokoelma_id) {
            var available = TutkimusService.tarkistaPaanumero(tyyppi, vm.tutkimus.properties.nayte_paanumero, kokoelma_id).then(function success(data) {
              if (data) {
                form.nayte_paanumero.$setValidity('kaytossa', true);
                vm.uniikkiNaytePaanumero = true;
              } else {
                form.nayte_paanumero.$setValidity('kaytossa', false);
                vm.uniikkiNaytePaanumero = false;
              }
            });
            return available;
          }
        }
        // Valokuvien kokoelmalajin vaihdolla tyhjennetään päänumerot, jotta niiden uniikkivalidointi tehdään numeroa antaessa.
        if (tyyppi === 'valokuva') {
          vm.tutkimus.properties.digikuva_paanumero = null;
          vm.tutkimus.properties.mustavalko_paanumero = null;
          vm.tutkimus.properties.dia_paanumero = null;
        }
      };

      /**
       * Avaa linkistä valitun kohteen omaan ikkunaan.
       * Inventointi-tutkimuksella voi olla monta kohdetta, jolloin se välitetään tänne.
       */
      vm.avaaKohde = function (kohde) {
        var kohdeId = null;
        if (kohde) {
          kohdeId = kohde.properties.id;
        } else if (vm.tutkimus.properties.kohde) {
          kohdeId = vm.tutkimus.properties.kohde.id;
        }

        if (kohdeId != null) {
          KohdeService.fetchKohde(kohdeId).then(function (haettu_kohde) {
            EntityBrowserService.setQuery('kohde', haettu_kohde.properties.id, { 'kohde_id': haettu_kohde.properties.id }, 1);
            ModalService.kohdeModal(haettu_kohde);
          });
        }
      };

      /**
       * Show yksikot modal
       */
      vm.showUnits = function () {
        ModalService.projektiYksikotModal(vm.projekti);
      };

      /**
       * Poista tutkimus
       */
      vm.poistaTutkimus = function () {
        // Poisto estetty jos tutkimuksella on tutkimusalueita
        if (vm.tutkimus.properties.tutkimusalueet.length > 0) {
          locale.ready('research').then(function () {
            AlertService.showError(locale.getString('research.Delete_failed'), locale.getString('research.Research_delete_error'));
          });
        } else {
          var conf = confirm(locale.getString('common.Confirm_delete2', { 'item': vm.tutkimus.properties.nimi }));
          if (conf) {
            TutkimusService.poistaTutkimus(vm.tutkimus).then(function () {
              vm.close();
              $scope.$destroy();
              locale.ready('common').then(function () {
                AlertService.showInfo(locale.getString('common.Deleted'));
              });
            }, function error(data) {
              locale.ready('area').then(function () {
                AlertService.showError(locale.getString('ark.Research_delete_failed'), AlertService.message(data));
              });
            });
          }
        }
      };

      /*
       * Lisätään uusi tutkimusalue.
       * @param lueTiedostosta: Jos true - avataan tiedostonlatausikkuna.
       * Jos false - avataan normaali tutkimusalueModal, jossa käyttäjä voi
       * lisätä manuaalisesti tutkimusalueen.
       */
      vm.lisaaTutkimusalue = function (lueTiedostosta) {
        if (vm.tutkimus.properties.tutkimuslaji.id === 5 && vm.tutkimus.properties.tutkimusalueet.length > 0) {
          AlertService.showWarning(locale.getString('ark.Arc_inventory_only_one_area'));
          return;
        }
        if (vm.kayttajaArkRooli !== 'pääkäyttäjä' && vm.tutkimus.properties.tutkimuslaji.id === 5) {
          AlertService.showWarning(locale.getString('ark.Arc_inventory_only_admin_can_create_areas'));
        }
        if (lueTiedostosta === true) {
          // Avataan fileUploadController
          ModalService.lisaaTutkimusalueTiedosto(vm.tutkimus, vm.modalId);
        } else {
          ModalService.tutkimusalueModal(null, vm.modalId, vm.tutkimus);
        }
      };

      /*
       * Avataan tutkimusalue.
       */
      vm.showTutkimusalue = function (ta) {
        TutkimusalueService.fetchTutkimusalue(ta.properties.id).then(function (tutkimusalue) {
          ModalService.tutkimusalueModal(tutkimusalue, vm.modalId, vm.tutkimus);
        }, function (data) {
          AlertService.showError(locale.getString('error.Error'), AlertService.message(data));
        });
      };

      // TODO: Toteuta alla olevat ajatuksella, nyt ainoastaan tämmöiset.
      $scope.$on('Tutkimusalue_lisatty', function (event, data) {
        if (vm.modalId === data.modalId || (data.tutkimusId && vm.tutkimus.properties.id === data.tutkimusId)) {
          var add = true;
          var onlyGeom = false;
          for (var i = 0; i < vm.tutkimus.properties.tutkimusalueet.length; i++) {
            var ta = vm.tutkimus.properties.tutkimusalueet[i];
            if (ta.properties.id == data.tutkimusalue.properties.id) {
              vm.tutkimus.properties.tutkimusalueet[i].havainnot = data.tutkimusalue.properties.havainnot;
              vm.tutkimus.properties.tutkimusalueet[i].sijaintikuvaus = data.tutkimusalue.properties.sijaintikuvaus;

              if (data.tutkimusalue.geometry != null) {
                vm.tutkimus.properties.tutkimusalueet[i].geometry = data.tutkimusalue.geometry;
                onlyGeom = true;
                add = false;
              } else {
                vm.tutkimus.properties.tutkimusalueet.splice(i, 1, data.tutkimusalue);
                add = false;
              }
            }
          }
          if (add) {
            vm.tutkimus.properties.tutkimusalueet.push(data.tutkimusalue);
          }
          // Inventointi-tutkimuksen kohteet
          if (data.invKohteet) {
            vm.invKohteet = data.invKohteet;
            vm.tutkimus.properties.inventointiKohteet = data.invKohteet;
          }

          // Aakkosjärjestykseen nimen mukaan
          var orderedList = $filter('orderBy')(vm.tutkimus.properties.tutkimusalueet, 'properties.nimi');
          vm.tutkimus.properties.tutkimusalueet = orderedList;

          vm.updateTutkimusalueLabels();

          vm.updateLayerData('Tutkimusalueet');

          if (vm.inventointiTutkimus) {
            vm.updateLayerData('Kohteet');
          }

          /**
             * Keskitetään kartta tutkimusalueiden päivityksen jälkeen.
             */
          vm.centerToExtent(vm.tutkimus.properties.tutkimusalueet);
        }
      });

      $scope.$on('Tutkimusalue_poistettu', function (event, data) {
        if (vm.modalId === data.modalId) {
          for (var i = 0; i < vm.tutkimus.properties.tutkimusalueet.length; i++) {
            var ta = vm.tutkimus.properties.tutkimusalueet[i];
            if (ta.properties.id == data.tutkimusalue.properties.id) {
              vm.tutkimus.properties.tutkimusalueet.splice(i, 1);
            }
          }
          // Inventoinnin kohteet tyhjennetään
          vm.invKohteet = [];
          vm.updateLayerData('Tutkimusalueet');
        }
      });

      /*
       * Muutoshistorian avaus
       */
      vm.showMuutoshistoria = function () {
        MuutoshistoriaService.getArkTutkimusMuutoshistoria(vm.tutkimus.properties.id).then(function (historia) {
          ModalService.tutkimusMuutoshistoriaModal(historia, vm.tutkimus.properties.nimi);
        });
      };

      /*
       *  Lisää näyte tutkimukselle. Tila on aina 4 = Luetteloitu.
       */
      vm.lisaaNayte = function () {
        var naytteen_tila = {
          'id': 4,
          'nimi_fi': 'Luetteloitu'
        };

        // Uudelle näytteelle laitetaan tutkimuksen id viittaus ja muut oletusarvot
        vm.uusiNayte = {
          'properties': {
            'ark_tutkimusalue_yksikko_id': null,
            'yksikkotunnus': null,
            'ark_tutkimus_id': vm.tutkimus.properties.id,
            'ark_nayte_tila_id': 4,
            'tila': naytteen_tila,
            'naytetta_jaljella': true,
            'tutkimus': vm.tutkimus.properties,
            'yksikko': null,
            'ark_naytekoodi_id': null,
            'luettelointinumero': null,
            'naytekoodi': null
          }
        };
        // Avataan näyte tietojen syöttöön
        ModalService.nayteModal(vm.uusiNayte, true);
      };

      /*
       * Kohteet valintalista
       */
      vm.haeKohteet = function (nimi) {
        if (nimi != undefined && nimi !== "") {
          KohdeService.getKohteet({
            'rivit': 50,
            'nimi': nimi
          }).then(function success(data) {
            vm.kohteet = data.features;
          }, function error(data) {
            locale.ready('error').then(function () {
              AlertService.showError(locale.getString('error.Getting_designers_failed'), AlertService.message(data));
            });
          });
        }
      };
      var nimihaku = null;
      if (vm.tutkimus.properties.kohde && vm.tutkimus.properties.kohde.nimi) {
        nimihaku = vm.tutkimus.properties.kohde.nimi;
      }
      vm.haeKohteet(nimihaku);

      /*
       * Kohteen valinta päivittää kunnan nimen näyttämisen.
       * Tarkastustutkimuksella muodostetaan tutkimuksen nimi kohteen ja kuluvan vuoden mukaan.
       * Muoto: Kohteen tarkastus 2019 kohdenimi
       */
      vm.paivitaKohdeKunta = function (kohde) {
        if (!kohde) {
          if (vm.tutkimus.properties.tutkimuslaji.id === 11) {
            vm.tutkimus.properties.nimi = null;
          }
        } else {
          if (kohde.properties.kunnatkylat) {
            vm.tutkimus.properties.kohde_kunta = kohde.properties.kunnatkylat[0].kunta;
          }

          if (vm.tutkimus.properties.tutkimuslaji.id === 11) {
            vm.paivitaTarkastustutkimusNimi(kohde);
          }
        }
      };
      vm.paivitaTarkastustutkimusNimi = function (kohde) {
        var nimi = locale.getString("ark.Targets_inspection").concat(' ');
        nimi = nimi.concat(new Date().getFullYear()).concat(' ');
        nimi = nimi.concat(kohde.properties.nimi).concat(' ');
        vm.tutkimus.properties.nimi = nimi;
      };

      // Onko inventointi-tutkimus
      vm.inventointiTutkimus = function () {
        if (vm.tutkimus.properties.tutkimuslaji && vm.tutkimus.properties.tutkimuslaji.id === 5) {
          return true;
        } else {
          return false;
        }
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
      };

      /*
       * -------------------------MAP SWITCHING------------------------------------
       */

      /**
       * Controller-spesifinen funktio, jossa asetetaan oletuksena näkyvät objektitasot.
       *
       */
      vm.selectDefaultObjectLayers = function () {
        // Add default layer
        if (vm.tutkimus.properties.ark_tutkimuslaji_id == 11) {
          // Tarkastustutkimus
          this.selectedLayers.push('Kohteet');
        } else if (vm.tutkimus.properties.ark_tutkimuslaji_id == 5) {
          // Inventointi tutkimus
          this.selectedLayers.push('Kohteet');
          this.selectedLayers.push('Tutkimusalueet');
        } else {
          this.selectedLayers.push('Tutkimusalueet');
        }

        this.selectedLayers = MapService.selectLayer(vm.mapLayers, vm.selectedLayers, {}, true, null, null);

        /*
         * Add features, first select the layer and then set the layer source to the kohde.
         */
        var taLayer = null;
        var kLayer = null;
        for (var i = 0; i < vm.mapLayers.length; i++) {
          if (vm.mapLayers[i].name == 'Tutkimusalueet') {
            taLayer = vm.mapLayers[i];
            if (taLayer != null) {
              vm.updateLayerData('Tutkimusalueet');
            }
            break;
          }
          if (vm.mapLayers[i].name == 'Kohteet') {
            kLayer = vm.mapLayers[i];
            if (kLayer != null) {
              vm.updateLayerData('Kohteet');
            }
          }
        }
      };

      /*
       * Select  layers
       */
      vm.selectLayer = function () {
        vm.selectedLayers = MapService.selectLayer(vm.mapLayers, vm.selectedLayers, {}, true, null, null);

        for (var i = 0; i < vm.mapLayers.length; i++) {
          if (vm.mapLayers[i].name == 'Tutkimusalueet') {
            vm.updateLayerData('Tutkimusalueet');
          }
          if (vm.mapLayers[i].name == 'Kohteet') {
            vm.updateLayerData('Kohteet');
          }
          if (vm.mapLayers[i].name == 'Reitit') {
            vm.updateLayerData('Reitit');
          }
        }
      };

      /**
       * Controller-spesifinen funktio, jossa määritetään mitä dataa millekin controllerin käsittelemälle tasolle
       * asetetaan kun taso valitaan.
       */
      vm.updateLayerData = function (layerName) {
        var featuresWithGeom = [];
        var kohteetWithGeom = [];
        for (var i = 0; i < vm.tutkimus.properties.tutkimusalueet.length; i++) {
          if (vm.tutkimus.properties.tutkimusalueet[i].geometry) {
            featuresWithGeom.push(vm.tutkimus.properties.tutkimusalueet[i]);
          }
        }
        if (vm.ladattuKohde) {
          for (var i = 0; i < vm.ladattuKohde.properties.sijainnit.length; i++) {
            if (vm.ladattuKohde.properties.sijainnit[i].geometry) {
              kohteetWithGeom.push(vm.ladattuKohde.properties.sijainnit[i]);
            }
          }
        }
        if (vm.kohde) {
          for (var i = 0; i < vm.kohde.properties.sijainnit.length; i++) {
            if (vm.kohde.properties.sijainnit[i].geometry) {
              kohteetWithGeom.push(vm.kohde.properties.sijainnit[i]);
            }
          }
        }

        if (vm.invKohteet.length > 0) {
          for (var j = 0; j < vm.invKohteet.length; j++) {
            var invKohde = vm.invKohteet[j];
            if (invKohde.properties.sijainnit) {
              for (var i = 0; i < invKohde.properties.sijainnit.length; i++) {
                if (invKohde.properties.sijainnit[i].geometry) {
                  kohteetWithGeom.push(invKohde.properties.sijainnit[i]);
                }
              }
            }
          }
        }

        var l = null;
        for (var i = 0; i < vm.mapLayers.length; i++) {
          if (vm.mapLayers[i].name == layerName) {
            l = vm.mapLayers[i];
            break;
          }
        }
        // If we found a valid layer and it's active (=is visible), get the features for the view.
        if (l && l.active) {
          if (l.name == 'Tutkimusalueet') {
            l.source.geojson.object.features = featuresWithGeom;
          }
          if (l.name == 'Kohteet') {
            l.source.geojson.object.features = kohteetWithGeom;
          }
          if (l.name == 'Reitit') {
            var tutkimusTyyppi = null;
            if (vm.tutkimus.properties.ark_tutkimuslaji_id == 5) {
              tutkimusTyyppi = 'Inventointitutkimus';
            } else if (vm.tutkimus.properties.ark_tutkimuslaji_id == 11) {
              tutkimusTyyppi = 'Tarkastustutkimus';
            } else {
              return; // Ei tuettu tutkimustyyppi
            }
            LocationService.getReitit({ 'entiteettiTyyppi': tutkimusTyyppi, 'entiteettiId': vm.tutkimus.properties.id }).then(function success(data) {
              l.source.geojson.object.features = data.features;
              // eslint-disable-next-line angular/controller-as
              $scope.reitit = data.features;
            }, function error(data) {
              AlertService.showError("error.Getting_routes_failed");
            });
          }
        }
      };

      // Move handler of the map. Make the pointer appropriate.
      // Show popup on mouseover. (TODO: how to make it work in
      // fullscreen mode?)
      $scope.$on('openlayers.map.pointermove', function (event, data) {
        $scope.$apply(function () {
          if (vm.map) {
            var map = vm.map;

            if (!vm.edit) {
              var pixel = map.getEventPixel(data.event.originalEvent);

              var layerHit = null;
              var featureHit = map.forEachFeatureAtPixel(pixel, function (feature, layer) {
                layerHit = layer;
                map.getTarget().style.cursor = 'pointer';
                return feature;
              });

              if (typeof featureHit === 'undefined') {
                MapService.hideMapPopup(vm.mapPopupId);
                map.getTarget().style.cursor = 'move';
              } else {
                MapService.showMapPopup(vm.mapPopupId, data, featureHit, layerHit, true);
              }
            } else {
              MapService.hideMapPopup(vm.mapPopupId);

              if (vm.drawingTool || vm.pointTool || vm.getDetailsTool) {
                map.getTarget().style.cursor = 'pointer';
              } else {
                map.getTarget().style.cursor = 'move';
              }
            }
          }
        });
      });

      // Click handler of the map. "Move" the feature by wiping it
      // and creating a new one.
      $scope.$on('openlayers.map.singleclick', function (event, data) {
        // ...but only in edit mode.
        if (!vm.edit) {
          var pixel = vm.map.getEventPixel(data.event.originalEvent);

          var layerHit = null;
          var featureHit = vm.map.forEachFeatureAtPixel(pixel, function (feature, layer) {
            layerHit = layer;
            return feature;
          });
          if (typeof featureHit !== 'undefined') {
            if (layerHit.getProperties().name == 'Tutkimusalueet') {
              TutkimusalueService.fetchTutkimusalue(featureHit.getProperties().id).then(function (tutkimusalue) {
                ModalService.tutkimusalueModal(tutkimusalue, vm.modalId, vm.tutkimus);
              });
            }
            if (layerHit.getProperties().name == 'Kohteet') {
              KohdeService.fetchKohde(featureHit.getProperties().id).then(function (kohde) {
                if (kohde.properties.kyppi_status == '1') {
                  AlertService.showInfo(locale.getString('ark.Relic_register_added'));
                } else if (kohde.properties.kyppi_status == '2') {
                  AlertService.showInfo(locale.getString('ark.Relic_register_modified'));
                }
                EntityBrowserService.setQuery('kohde', kohde.properties.id, { 'kohde_id': kohde.properties.id }, 1);
                ModalService.kohdeModal(kohde);
              });
            }
            if (layerHit.getProperties().name == 'Reitit') {
              var featureId = featureHit.getProperties().id;
              for (var i = 0; i < $scope.reitit.length; i++) {
                if ($scope.reitit[i].properties.id === featureId) {
                  ModalService.reittiModal($scope.reitit[i], 'arkeologia', 'ark_tutkimus', vm.tutkimus);
                  break;
                }
              }
            }
          }
        }
      });

      /*
       * Open the manage users modal
       */
      vm.manageUsers = function () {
        ModalService.tutkimusKayttajatModal(vm.tutkimus);
      };

      /*
       * Haetaan tutkimuksen käyttäjät uudelleen käyttäjien muokkauksen jälkeen
       */
      $scope.$on('Update_data', function (event, data) {
        // Jossei päivitetä tutkimus_kayttajia, ei koske meitä
        if (data.type !== 'tutkimus_kayttajat') {
          return;
        }
        // Jos kyseessä on eri tutkimusId, ei koske meitä
        if (data.tutkimusId && parseInt(data.tutkimusId) !== vm.tutkimus.properties.id) {
          return;
        }

        // Haetaan tutkimus uudelleen ja ylikirjoitetaan vm.tutkimuksen käyttäjät
        // haetun tutkimuksen tutkimuskäyttäjillä
        TutkimusService.haeTutkimus(vm.tutkimus.properties.id).then(function s(data) {
          vm.tutkimus.properties.tutkimuskayttajat = data.properties.tutkimuskayttajat;
        }, function e(data) {
          AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
        });
      });

      // Jos reittejä muokataan, päivitetään reittitason sisältö
      $scope.$on('Reitti_modified', function (event, data) {
        vm.updateLayerData('Reitit');
      });

      vm.showMap = true;

      /*
       * Create a report
       * type: PDF / WORD / EXCEL ...
       * mode: loyto / poistetut_loydot
       */
      vm.createReport = function (type, mode) {
        // Asetetaan raportin "nimi" joka näkyy mm. raportit-välilehdellä
        // Raportin nimi + tutkimuksen nimi
        var reportDisplayName = locale.getString('ark.Discovery_report');
        if (mode === 'poistetut_loydot') {
          reportDisplayName = locale.getString('ark.Removed_discoveries_report');
          reportDisplayName += " " + vm.tutkimus.properties.nimi;
        } else if (mode === 'loyto') {
          reportDisplayName += " " + vm.tutkimus.properties.nimi;
        } else if (mode === 'tarkastusraportti') {
          reportDisplayName = locale.getString('ark.Inspection_report') + " " + vm.tutkimus.properties.nimi;
        } else {
          throw error("Unsupported report!");
        }

        var report = { 'tutkimusId': vm.tutkimus.properties.id, 'mode': mode, 'requestedOutputType': type, 'reportDisplayName': reportDisplayName };
        var reportMode = null;
        if (mode === 'loyto' || mode === 'poistetut_loydot') {
          reportMode = 'Loytoraportti';
        } else if (mode === 'tarkastusraportti') {
          reportMode = 'Tarkastusraportti';
        }

        RaporttiService.createRaportti(reportMode, report).then(function success(data) {
          AlertService.showInfo(locale.getString('common.Report_request_created'));
        }, function error(data) {
          AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
        });
      };

      // Luetteloimattomat kuvat
      vm.otherImages = [];
      vm.getOtherImages = function () {
        if (vm.tutkimus.properties.id) {
          FileService.getArkImages({
            'jarjestys': 'ark_kuva.id',
            'jarjestys_suunta': 'nouseva',
            'rivit': 1000,
            'ark_tutkimus_id': vm.tutkimus.properties.id,
            'ark_tutkimusalue_id': null,
            'luetteloitu': false,
            'tutkimus_view': true
          }).then(function success(images) {
            vm.otherImages = images.features;
            // Muiden kuvien määrä
            vm.muut_kuvat_kpl_maara = vm.otherImages.length;
            // Asetetaan tunnistekuva
            for (var i = 0; i < vm.otherImages.length; i++) {
              if (vm.otherImages[i].properties.tunnistekuva === true) {
                vm.tunnistekuva = vm.otherImages[i];
              }
            }
          }, function error(data) {
            locale.ready('error').then(function () {
              AlertService.showError(locale.getString("error.Getting_images_failed"), AlertService.message(data));
            });
          });
        }
      };
      vm.getOtherImages();

      /*
       * Lisää kuva. Luetteloitu tai muu kuva jos tarkastustutkimus
       */
      vm.addImage = function (luetteloi) {
        ModalService.arkImageUploadModal('tutkimus', vm.tutkimus, luetteloi, vm.tutkimus.properties.id);
      };

      /*
       * Avaa valittu kuva, välitetään kuvien lista.
       */
      vm.openImage = function (image, kuvat) {
        ModalService.arkImageModal(image, 'tutkimus', vm.tutkimus, vm.editRelatedPermissions, kuvat, vm.tutkimus.properties.id);
      };

      /*
       * Images were modified, fetch them again
       */
      $scope.$on('arkKuva_modified', function (event, data) {
        vm.getImages();
        vm.getOtherImages();
      });

      /*
       * Kartat
       */
      vm.kartat = [];
      vm.getKartat = function () {
        if (vm.tutkimus.properties.id) {
          KarttaService.getArkKartat({
            'jarjestys_suunta': 'nouseva',
            'rivit': 1000,
            'ark_tutkimus_id': vm.tutkimus.properties.id
          }).then(function success(kartat) {
            vm.kartat = kartat.features;
            // Karttojen määrä
            vm.kpl_maara = vm.kartat.length;
          }, function error(data) {
            locale.ready('error').then(function () {
              AlertService.showError(locale.getString("error.Getting_maps_failed"), AlertService.message(data));
            });
          });
        }
      };
      vm.getKartat();

      /*
       * Add kartta to the alue
       */
      vm.addKartta = function () {
        ModalService.arkKarttaUploadModal('tutkimus', vm.tutkimus, vm.tutkimus.properties.id);
      };

      /*
       * Open the selected kartta for viewing
       */
      vm.openKartta = function (kartta) {
        ModalService.arkKarttaModal(kartta, 'tutkimus', vm.tutkimus, vm.editRelatedPermissions, vm.kartat, vm.tutkimus.properties.id);
      };

      /*
       * Kartta were modified, fetch them again
       */
      $scope.$on('arkKartta_modified', function (event, data) {
        vm.getKartat();
      });

      /*
       * Tutkimustyypillä irtolöytö on aina valittuna TMK kokoelmalajiksi
       */
      $scope.$watch('vm.tutkimus.properties.tutkimuslaji', function (newV, oldV) {
        if (vm.create) {
          if (oldV === undefined && newV === undefined || oldV === newV) {
            return;
          }
          if (newV && newV.id) {
            if (newV.id === 6) { // Irtolöytö
              vm.tutkimus.properties.loyto_kokoelmalaji = { id: 2 }; // TMK
            }
            if (newV.id === 7) { // Kaivaus
              vm.tutkimus.properties.loyto_kokoelmalaji = null;
              vm.tutkimus.properties.nayte_kokoelmalaji = null;
              vm.tutkimus.properties.valokuva_kokoelmalaji = null;
              vm.tutkimus.properties.raportti_kokoelmalaji = null;
              vm.tutkimus.properties.kartta_kokoelmalaji = null;

              vm.tutkimus.properties.loyto_paanumero = null;
              vm.tutkimus.properties.nayte_paanumero = null;
              vm.tutkimus.properties.digikuva_paanumero = null;
              vm.tutkimus.properties.mustavalko_paanumero = null;
              vm.tutkimus.properties.dia_paanumero = null;
            }

            // Jos kohde on liitetty, tehdään nimi automaattisesti Tarkastustutkimukselle
            if (newV.id === 11) {
              if (vm.tutkimusKohde) {
                vm.paivitaTarkastustutkimusNimi(vm.tutkimusKohde);
              }
            }
          }
        }
      });

      /*
       * Jos kokoelmalaji muuttuu, asetetaan irtolöydön tilanteessa kaikille sama kokoelmalaji
       * Kaivaustyypillä kokoelmalajit ovat päänumerokohtaisia
       */
      $scope.$watch('vm.tutkimus.properties.loyto_kokoelmalaji', function (newV, oldV) {
        if (vm.create) {
          if (oldV === undefined && newV === undefined || oldV === newV) {
            return;
          }

          /*
           * Irtolöytö - Asetetaan kaikille tyypeille kokoelmalaji samaksi
           * ja näytteelle sama päänumero kuin löydöille
           */
          if (vm.tutkimus && vm.tutkimus.properties && vm.tutkimus.properties.tutkimuslaji && vm.tutkimus.properties.tutkimuslaji.id) {
            if (vm.tutkimus.properties.tutkimuslaji.id === 6) { // Irtolöytö
              vm.tutkimus.properties.nayte_kokoelmalaji = newV;
              vm.tutkimus.properties.valokuva_kokoelmalaji = newV;
              vm.tutkimus.properties.raportti_kokoelmalaji = newV;
              vm.tutkimus.properties.kartta_kokoelmalaji = newV;
              vm.tutkimus.properties.nayte_paanumero = vm.tutkimus.properties.loyto_paanumero;
            }
          }
        }
      });

      $scope.$watch('vm.tutkimus.properties.loyto_paanumero', function (newV, oldV) {
        if (vm.create) {
          if ((oldV === null && newV === null) || (oldV === undefined && newV === undefined)) {
            return;
          }
          // Asetetaan irtolöydölle sama näyte päänumero kuin löydön päänumero
          if (vm.tutkimus.properties.tutkimuslaji.id === 6) { // Irtolöytö
            vm.tutkimus.properties.nayte_paanumero = newV;
          }
        }
      });

      /*
      * Käyttäjien haku
      */
      vm.kayttajat = [];
      vm.getUsers = function () {
        UserService.getUsers({
          'rivit': 10000,
          'aktiivinen': 'true'
        }).then(function success(data) {
          vm.kayttajat = [];
          // Otetaan vain tarvittavat tiedot niin toimii ui selectissä
          for (var i = 0; i < data.features.length; i++) {
            var user = data.features[i].properties;
            vm.kayttajat.push(user);
          }
        }, function error(data) {
          locale.ready('error').then(function () {
            AlertService.showError(locale.getString("error.Getting_users_failed"), AlertService.message(data));
          });
        });
      };

      vm.getUsers();

      /*
       * Liitetiedostojen lisäys
       */
      vm.lisaaTiedosto = function () {
        // Avataan arkfileUploadController
        ModalService.arkFileUploadModal('tutkimus', vm.tutkimus, vm.tutkimus.properties.id);
      };

      vm.files = [];
      vm.getFiles = function () {
        if (vm.tutkimus.properties.id > 0) {
          FileService.getArkFiles({
            'jarjestys_suunta': 'nouseva',
            'rivit': 1000,
            'ark_tutkimus_id': vm.tutkimus.properties.id
          }).then(function success(files) {
            vm.files = files.features;
            // Tiedostojen määrä
            vm.kpl_maara = vm.files.length;
          }, function error(data) {
            locale.ready('error').then(function () {
              AlertService.showError(locale.getString("error.Getting_maps_failed"), AlertService.message(data));
            });
          });
        }
      };
      vm.getFiles();

      /*
       * Open the selected file for viewing
       */
      vm.openFile = function (file) {
        ModalService.arkFileModal(file, 'tutkimus', vm.tutkimus, vm.editRelatedPermissions, vm.tutkimus.properties.id);
      };

      /*
       * files were modified, fetch them again
       */
      $scope.$on('arkFile_modified', function (event, data) {
        vm.getFiles();
      });

      vm.addCoordinates = function (entityType) {
        ModalService.arkCoordinateFileUploadModal(entityType, vm.tutkimus);
      };

      // Jos kohde joka inventoitiin kuuluu tähän ja inventoitu tutkimus oli tämä tutkimus, päivitetään tieto näkyviin
      $scope.$on('Kohde_inventointi', function (event, data) {
        if (vm.tutkimus.properties.id == data.tutkimusId) {
          AlertService.showInfo('Inventointikohteen tiedot päivittyivät, avaa näkymä uudelleen nähdäksesi muutokset.');
        }
      });

      vm.tutkimusRaportti = function () {
        if (vm.tutkimus.properties.ark_tutkimuslaji_id === 7 || vm.tutkimus.properties.ark_tutkimuslaji_id === 10 || vm.tutkimus.properties.ark_tutkimuslaji_id === 12) {
          if (!vm.tutkimus.properties.kenttatyojohtaja) {
            AlertService.showWarning('Kenttätyöjohtaja-tiedon pitää olla täytettynä, jotta raportin voi tehdä.');
            return;
          }
          if (!vm.tutkimus.properties.kenttatyo_alkupvm || !vm.tutkimus.properties.kenttatyo_loppupvm) {
            AlertService.showWarning('Kenttätyön alku- ja loppupäivämäärät pitää olla täytettynä, jotta raportin voi tehdä.');
            return;
          }
        }

        TutkimusService.haeTutkimusraportti(vm.tutkimus.properties.id).then(function success(tutkimusraportti) {
          if (tutkimusraportti && tutkimusraportti.properties && tutkimusraportti.properties.id) { // Olemassaoleva tutkimusraportti
            ModalService.arkTutkimusraporttiModal(tutkimusraportti, vm.tutkimus.properties, vm.editRelatedPermissions);
          } else { // Tehdään uusi tyhjä tutkimusraportti
            ModalService.arkTutkimusraporttiModal({ properties: { kuvat_kansilehti: [], kuvat_johdanto: [], kuvat_tutkimus_ja_dokumentointimenetelmat: [], kuvat_yhteenveto: [], kuvat_havainnot: [] } }, vm.tutkimus.properties, vm.editRelatedPermissions);
          }
        }, function error(data) {
          AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
        });
      };

      // DEBUG!
      if (CONFIG.DEBUG) {
        hotkeys.bindTo($scope).add({
          combo: 'å',
          description: 'Tutkimuksen tiedot',
          callback: function () {
            console.log(angular.copy(vm.tutkimus));
          }
        });

        hotkeys.bindTo($scope).add({
          combo: 'ä',
          description: 'vm.features',
          callback: function () {
            console.log(angular.copy(vm.map));
          }
        });
        hotkeys.bindTo($scope).add({
          combo: 'ö',
          description: 'vm.features',
          callback: function () {
            console.log(angular.copy(vm.map.getLayers()));
          }
        });
      }
    }
  ]);
