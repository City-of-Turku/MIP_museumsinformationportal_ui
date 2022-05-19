/*
 * Näytteiden listaus controller. Näytteiden välilehti.
 */
angular.module('mip.nayte').controller('NayteListController', [
		'$scope', 'TabService', '$location', 'CONFIG', '$filter', 'NgTableParams', 'NayteService', 'ModalService',
		'AlertService', 'ListService', 'locale', '$rootScope', 'Auth', 'ListControllerService', 'KoriService',
		'EntityBrowserService',
		function($scope, TabService, $location, CONFIG, $filter, NgTableParams, NayteService, ModalService,
				AlertService, ListService, locale, $rootScope, Auth, ListControllerService, KoriService,
				EntityBrowserService) {

			var vm = this;

            /**
             * Setup-metodi
             */
            vm.setUp = function() {

                angular.extend(vm, ListControllerService);

	             // Tabin asetus
	             vm.updateTabs('common.Archeology', 'ark.Samples');

			     vm.getColVisibilities('nayte_tab');
            };
            vm.setUp();

            /**
             * ModalHeader kutsuu scopesta closea
             */
            $scope.close = function() {
            	vm.close();
            };

			/*
			 * Näytteet taulu
			 */
            vm.naytteetTable = new NgTableParams({
                page : 1,
                count : 50,
                total : 25
            }, {
                defaultSort : "asc",
                getData : function($defer, params) {

                    filterParameters = ListService.parseParameters(params);

                    if(vm.naytteetPromise !== undefined) {
                        vm.cancelRequest(vm.naytteetPromise);
                    }

                    // Hakukriteerit talteen
                    ListService.saveNayteSearchParameters(filterParameters);

                    vm.naytteetPromise = NayteService.haeNaytteet(filterParameters);
                    vm.naytteetPromise.then(function(data) {
                    	EntityBrowserService.setQuery('nayte', null, filterParameters);

                        if (data.count) {
                            vm.searchResults = data.count;
                        } else {
                            vm.searchResults = 0;
                        }

                        // Näytteiden id:t kerätään mahdollista koriin lisäämistä varten
                        vm.koriIdLista = [];
                        vm.koriIdLista = data.idlist;

                        params.total(data.total_count);
                        $defer.resolve(data.features);

                    }, function(data) {
                        locale.ready('common').then(function() {
                            AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
                        });
                        orderedData = [];
                        $defer.resolve(orderedData);
                    });
                }
            });


            /*
             * Monivalinta select vaatii properties luomisen
             */
            vm.alustaTaulukonFilter = function() {
                // Luodaan properties
                var filter = {
                        'properties' : {}
                    };

                // Näytettä jäljellä oletus = Kaikki
		        filter['properties']['naytetta_jaljella'] = 3;

		        // Ajoitusnäytteen luokka = Kaikki
		        filter['properties']['luokka'] = 5;

		        // Lisätään taulukon filttereihin
                angular.extend(vm.naytteetTable.filter(), filter);
            };

            vm.alustaTaulukonFilter();

			/*
			 * Avaa näyte katselutilaan
			 */
			vm.avaaNayte = function(valittu_nayte) {
            	NayteService.haeNayte(valittu_nayte.properties.id).then(function(nayte) {
            		EntityBrowserService.setQuery('nayte', nayte.properties.id, filterParameters, vm.naytteetTable.total());
            		ModalService.nayteModal(nayte, false);

				});
			};

			/*
			 * Päivitetään näytteiden taulukko, jos tiedot päivittyneet
			 */
            $scope.$on('Update_data', function(event, data) {
                if (data.type == 'nayte') {
                    vm.naytteetTable.reload();
                }
            });

			vm.curLocale = locale.getLocale();

            /**
             * Avaa korin hakutulosten lisäämisen ikkunaan. Välitetään lista haetuista näyte id:stä
             */
            vm.lisaaKoriin = function(){
            	// Haetaan näytteiden korityyppi
            	vm.koriPromise = KoriService.haeKorityyppi('ark_nayte');
				vm.koriPromise.then(function (korityyppi){
					if(korityyppi){
						ModalService.lisaaKoriModal(vm.koriIdLista, korityyppi, 'ARK');
					}
				}, function(data) {
                    locale.ready('common').then(function() {
                        AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
                    });
                });
            };

            /*
             * Valintalistan arvot
             */
            vm.naytettaJaljellaArvot = [
        		{id : 1, nimi_fi : "Näytettä jäljellä: Ei"},
        		{id : 2, nimi_fi : "Näytettä jäljellä: Kyllä"},
        		{id : 3, nimi_fi : "Näytettä jäljellä: Kaikki"}
    		];

            /*
             *  Ajoitusnäytteen luokat
             */
            vm.ajoitusluokat = [
        		{id : 1, hakunimi_fi : "Luokka: kelvoton", nimi_fi: "kelvoton"},
        		{id : 2, hakunimi_fi : "Luokka: +", nimi_fi: "+"},
        		{id : 3, hakunimi_fi : "Luokka: ++", nimi_fi: "++"},
        		{id : 4, hakunimi_fi : "Luokka: +++", nimi_fi: "+++"},
        		{id : 5, hakunimi_fi : "Luokka: Kaikki"}
    		];

			 /**
             * Tallennetut hakukriteerit
             */
            vm.getSearchValues = function() {
                var searchProps = ListService.getProps();

                var filter = {
                    'properties' : {}
                };
                if (searchProps['nay_jarjestys'] && searchProps['nay_jarjestys_suunta']) {
                	vm.naytteetTable.sorting(searchProps['nay_jarjestys'], searchProps['nay_jarjestys_suunta']);
                }
                if (searchProps['nayte_paanumero']) {
                    filter['properties']['nayte_paanumero'] = searchProps['nayte_paanumero'];
                }
                if (searchProps['nayte_luettelointinumero']) {
                    filter['properties']['luettelointinumero'] = searchProps['nayte_luettelointinumero'];
                }
                if (searchProps['nayte_tutkimuksen_nimi']) {
                    filter['properties']['tutkimuksen_nimi'] = searchProps['nayte_tutkimuksen_nimi'];
                }
                if (searchProps['nayte_tutkimusLyhenne']) {
                    filter['properties']['tutkimusLyhenne'] = searchProps['nayte_tutkimusLyhenne'];
                }
                if (searchProps['nayte_yksikkotunnus']) {
                    filter['properties']['yksikkotunnus'] = searchProps['nayte_yksikkotunnus'];
                }
                if (searchProps['naytekoodit']) {
                    filter['properties']['naytekoodit'] = searchProps['naytekoodit'];
                }
                if (searchProps['naytetyypit']) {
                    filter['properties']['naytetyypit'] = searchProps['naytetyypit'];
                }
                if (searchProps['naytetta_jaljella']) {
                    filter['properties']['naytetta_jaljella'] = searchProps['naytetta_jaljella'];
                }else{
                	filter['properties']['naytetta_jaljella'] = 3;
                }
                if (searchProps['nayte_kuvaus']) {
                    filter['properties']['kuvaus'] = searchProps['nayte_kuvaus'];
                }
                if (searchProps['nayte_lisatiedot']) {
                    filter['properties']['lisatiedot'] = searchProps['nayte_lisatiedot'];
                }
                if (searchProps['naytteen_tilat']) {
                    filter['properties']['naytteen_tilat'] = searchProps['naytteen_tilat'];
                }
                if (searchProps['luokka']) {
                    filter['properties']['luokka'] = searchProps['luokka'];
                }else{
                	filter['properties']['luokka'] = 5;
                }

                angular.extend(vm.naytteetTable.filter(), filter);
            }
            vm.getSearchValues();

            /*
             * Tyhjennä hakukriteerit
             */
            vm.clearSearchFilter = function() {
                ListService.clearProps();
                vm.getSearchValues();

            };

            // Event for successful QR code reading
            $scope.onSuccess = function (data) {
              $scope.scannerText = data;
              this.$hide();
              $scope.getByLuettelointinumero(data);
            };

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
            };

            // Näytteen hakeminen QR koodista luetun luettelointinumeron avulla
            $scope.getByLuettelointinumero = function(luettelointinumero) {
              NayteService.haeNayteLuettelointinumerollaQR(luettelointinumero).then(function(nayte) {
                EntityBrowserService.setQuery('nayte', nayte.properties.id, filterParameters, vm.naytteetTable.total());
                ModalService.nayteModal(nayte, false);
              });
            };

		}
]);
