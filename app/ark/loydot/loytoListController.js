/*
 * Löytöjen listaus controller. Löytöjen välilehti.
 */
angular.module('mip.loyto').controller('LoytoListController', [
		'$scope', 'TabService', '$location', 'CONFIG', '$filter', 'NgTableParams', 'LoytoService', 'ModalService',
		'AlertService', 'ListService', 'locale', '$rootScope', 'Auth', 'ListControllerService', 'KoriService',
		'EntityBrowserService',
		function($scope, TabService, $location, CONFIG, $filter, NgTableParams, LoytoService, ModalService,
				AlertService, ListService, locale, $rootScope, Auth, ListControllerService, KoriService,
				EntityBrowserService) {

			var vm = this;

            /**
             * Setup-metodi
             */
            vm.setUp = function() {

                angular.extend(vm, ListControllerService);

	             // Tabin asetus
	             vm.updateTabs('common.Archeology', 'ark.Discoveries');

			     vm.getColVisibilities('loyto_tab');
           vm.showQRCodeButton = true;
            };
            vm.setUp();

            /**
             * ModalHeader kutsuu scopesta closea
             */
            $scope.close = function() {
            	vm.close();
            };

			/*
			 * Löydöt
			 */
            vm.loydotTable = new NgTableParams({
                page : 1,
                count : 50,
                total : 25
            }, {
                defaultSort : "asc",
                getData : function($defer, params) {

                    filterParameters = ListService.parseParameters(params);

                    if(vm.loydotPromise !== undefined) {
                        vm.cancelRequest(vm.loydotPromise);
                    }

                    // Hakukriteerit talteen
                    ListService.saveLoytoSearchParameters(filterParameters);

                    vm.loydotPromise = LoytoService.haeLoydot(filterParameters);
                    vm.loydotPromise.then(function(data) {
                    	EntityBrowserService.setQuery('loyto', null, filterParameters);

                        if (data.count) {
                            vm.searchResults = data.count;
                        } else {
                            vm.searchResults = 0;
                        }

                        // Löytöjen id:t kerätään mahdollista koriin lisäämistä varten
                        vm.koriIdLista = [];
                        var i = 0;
                        vm.koriIdLista = data.idlist;

                        // no sorting, it is done in backend
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

            // Ajoitusten valintalista
            vm.ajoitukset = [
        		{id : 1, nimi_fi : "Ajoitetut"},
        		{id : 2, nimi_fi : "Ajoittamattomat"},
        		{id : 3, nimi_fi : "Kaikki ajoitukset"}
    		];

            // Vaatii konservointia valintalista
            vm.konservointiLista = [
        		{id : 1, nimi_fi : "Ei vaadi konservointia"},
        		{id : 2, nimi_fi : "Vaatii konservointia"},
        		{id : 3, nimi_fi : "Ehkä vaatii konservointia"},
        		{id : 4, nimi_fi : "Konservoinnin tarve (kaikki)"}
    		];

            /*
             * Ajanlasku
             */
            vm.ajanlaskut = [
        		{id : null, nimi_fi : ""},
        		{id : "jaa", nimi_fi : "jaa"},
        		{id : "eaa", nimi_fi : "eaa"}
            ];
            vm.alkuvuosi_ajanlasku = null;
            vm.paatosvuosi_ajanlasku = null;

            /*
             * Löytötaulukon suodatusten oletukset asetetaan yksikkö-sivun valinnan mukaan.
             */
            vm.hakuOletukset = function() {
                // Luodaan properties
                var filter = {
                        'properties' : {}
                    };

                // Ajoitusvalintalista
		        filter['properties']['valittu_ajoitus'] = 3;

                // Vaatii konservointia: kaikki
		        filter['properties']['vaatii_konservointia'] = 4;

		        // Kokoelmatunnus
		        // TODO filter['properties']['loyto_kokoelmalaji'] = {id: 2, nimi_fi: 'Turun museokeskus (TMK)'};

		        // Lisätään taulukon filttereihin
                angular.extend(vm.loydotTable.filter(), filter);
            };

            vm.hakuOletukset();

			/*
			 * Avaa löytö katselutilaan
			 */
			vm.selectLoyto = function(valittu_loyto) {

            	LoytoService.haeLoyto(valittu_loyto.properties.id).then(function(loyto) {
            		EntityBrowserService.setQuery('loyto', loyto.properties.id, filterParameters, vm.loydotTable.total());
            		ModalService.loytoModal(loyto, false);

				});

			};

			/*
			 * Päivitetään löytöjen taulukko, jos tiedot päivittyneet
			 */
            $scope.$on('Update_data', function(event, data) {
                if (data.type == 'loyto') {
                    vm.loydotTable.reload();
                }
            });
            $scope.$on('Update_loyto', function(event, data) {
                if (data.type == 'loyto') {
                    vm.refreshTable('loytoCache', 'loydotTable')
                }
            });

			vm.curLocale = locale.getLocale();

            /**
             * Avaa korin hakutulosten lisäämisen ikkunaan. Välitetään lista haetuista löytö id:stä.
             */
            vm.lisaaKoriin = function(){
            	// Haetaan löytöjen korityyppi
            	vm.koriPromise = KoriService.haeKorityyppi('ark_loyto');
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

			 /**
             * Tallennetut hakukriteerit
             */
            vm.getSearchValues = function() {
                var searchProps = ListService.getProps();
                var value = "";
                var filter = {
                    'properties' : {}
                };
                if (searchProps['loy_jarjestys'] && searchProps['loy_jarjestys_suunta']) {
                	vm.loydotTable.sorting(searchProps['loy_jarjestys'], searchProps['loy_jarjestys_suunta']);
                }
                if (searchProps['loyto_paanumero']) {
                    filter['properties']['loyto_paanumero'] = searchProps['loyto_paanumero'];
                }
                if (searchProps['materiaalikoodit']) {
                    filter['properties']['materiaalikoodit'] = searchProps['materiaalikoodit'];
                }
                if (searchProps['ensisijaiset_materiaalit']) {
                    filter['properties']['ensisijaiset_materiaalit'] = searchProps['ensisijaiset_materiaalit'];
                }
                if (searchProps['materiaalit']) {
                    filter['properties']['materiaalit'] = searchProps['materiaalit'];
                }
                if (searchProps['luettelointinumero']) {
                    filter['properties']['luettelointinumero'] = searchProps['luettelointinumero'];
                }
                if (searchProps['loytotyypit']) {
                    filter['properties']['loytotyypit'] = searchProps['loytotyypit'];
                }
                if (searchProps['loytotyyppi_tarkenteet']) {
                    filter['properties']['loytotyyppi_tarkenteet'] = searchProps['loytotyyppi_tarkenteet']; // esineen nimi näytöllä
                }
                if (searchProps['valittu_ajoitus']) {
                    filter['properties']['valittu_ajoitus'] = searchProps['valittu_ajoitus'];
                } else {
                	filter['properties']['valittu_ajoitus'] = 3;
                }
                if (searchProps['tutkimuksen_nimi']) {
                    filter['properties']['tutkimuksen_nimi'] = searchProps['tutkimuksen_nimi'];
                }
                if (searchProps['tutkimusLyhenne']) {
                    filter['properties']['tutkimusLyhenne'] = searchProps['tutkimusLyhenne'];
                }
                if (searchProps['yksikkotunnus']) {
                    filter['properties']['yksikkotunnus'] = searchProps['yksikkotunnus'];
                }
                if (searchProps['merkinnat']) {
                    filter['properties']['merkinnat'] = searchProps['merkinnat'];
                }
                if (searchProps['tulkinta']) {
                    filter['properties']['tulkinta'] = searchProps['tulkinta'];
                }
                if (searchProps['loydon_asiasanat']) {
                    filter['properties']['loydon_asiasanat'] = searchProps['loydon_asiasanat'];
                }
                if (searchProps['loydon_tilat']) {
                    filter['properties']['loydon_tilat'] = searchProps['loydon_tilat'];
                }
                if (searchProps['vaatii_konservointia']) {
                    filter['properties']['vaatii_konservointia'] = searchProps['vaatii_konservointia'];
                } else {
                	filter['properties']['vaatii_konservointia'] = 4;
                }
                if (searchProps['kuvaus']) {
                    filter['properties']['kuvaus'] = searchProps['kuvaus'];
                }
                if (searchProps['lisatiedot']) {
                    filter['properties']['lisatiedot'] = searchProps['lisatiedot'];
                }
                if (searchProps['alkuvuosi']) {
                    filter['properties']['alkuvuosi'] = searchProps['alkuvuosi'];
                }
                if (searchProps['alkuvuosi_ajanlasku']) {
                    filter['properties']['alkuvuosi_ajanlasku'] = searchProps['alkuvuosi_ajanlasku'];
                    vm.alkuvuosi_ajanlasku = searchProps['alkuvuosi_ajanlasku'];
                }else {
                	filter['properties']['alkuvuosi_ajanlasku'] = null;
                }
                if (searchProps['paatosvuosi']) {
                    filter['properties']['paatosvuosi'] = searchProps['paatosvuosi'];
                }
                if (searchProps['paatosvuosi_ajanlasku']) {
                    filter['properties']['paatosvuosi_ajanlasku'] = searchProps['paatosvuosi_ajanlasku'];
                    vm.paatosvuosi_ajanlasku = searchProps['paatosvuosi_ajanlasku'];
                }else {
                	filter['properties']['paatosvuosi_ajanlasku'] = null;
                }
                if(searchProps['loyto_alue']) {
                	filter['properties']['loyto_alue'] = searchProps['loyto_alue'];
                }
                if (searchProps['loytopaikan_tarkenne']) {
                    filter['properties']['loytopaikan_tarkenne'] = searchProps['loytopaikan_tarkenne'];
                }
                if (searchProps['kenttanumero_vanha_tyonumero']) {
                    filter['properties']['kenttanumero_vanha_tyonumero'] = searchProps['kenttanumero_vanha_tyonumero'];
                }

                angular.extend(vm.loydotTable.filter(), filter);
            }
            vm.getSearchValues();

            /*
             * Tyhjennä hakukriteerit
             */
            vm.clearSearchFilter = function() {
                ListService.clearProps();
                vm.getSearchValues();
                vm.loydotTable.filter().properties.valittu_ajoitus = 3;
                vm.loydotTable.filter().properties.vaatii_konservointia = 4;
                vm.alkuvuosi_ajanlasku = null;
                vm.paatosvuosi_ajanlasku = null;
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

            // Löydön hakeminen QR koodista luetun luettelointinumeron avulla
            $scope.getByLuettelointinumero = function(luettelointinumero) {
              LoytoService.haeLoytoLuettelointinumerollaQR(luettelointinumero).then(function(loyto) {
                  EntityBrowserService.setQuery('loyto', loyto.properties.id, filterParameters, vm.loydotTable.total());
                  ModalService.loytoModal(loyto, false);
              });
            };
		}
]);
