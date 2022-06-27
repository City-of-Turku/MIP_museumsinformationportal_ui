/* eslint-disable quote-props */
/* eslint-disable indent */
/* eslint-disable angular/function-type */
/* eslint-disable space-before-blocks */
/* eslint-disable angular/controller-as */
/* eslint-disable padded-blocks */
/* eslint-disable space-before-function-paren */
/* eslint-disable dot-notation */

/*
 * Kori UI controller
 */
angular.module('mip.kori').controller(
		'KoriController',
		[
			'$scope', 'AlertService', 'ModalService', 'ListService', 'locale',
			'hotkeys', 'UserService', 'NgTableParams', 'LoytoService',
			 'selectedModalNameId', 'ModalControllerService', 'KoriService', 'koriIdLista', 'korityyppi', 'kori', 'uusiKori',
			 'RaporttiService', 'EntityBrowserService', 'NayteService', 'mip_alue', 'KiinteistoService', 'RakennusService',
			 'ArvoalueService', 'AlueService', 'kayttajat', '$timeout',
			function ($scope, AlertService, ModalService, ListService, locale,
			        hotkeys, UserService, NgTableParams, LoytoService,
			        selectedModalNameId, ModalControllerService, KoriService, koriIdLista, korityyppi, kori, uusiKori,
			        RaporttiService, EntityBrowserService, NayteService, mip_alue, KiinteistoService, RakennusService,
			        ArvoalueService, AlueService, kayttajat, $timeout) {

			    var vm = this;

			    /**
			     * Controllerin set-up.
			     */
			    vm.setUp = function() {

			    	// Käyttöoikeutena riittää, jos on muu kuin katselija-rooli
			    	var rakRooli = UserService.getProperties().user.rooli;
			    	var arkRooli = UserService.getProperties().user.ark_rooli;

			    	//Kaikilla on oikeudet poistaa ja muokata omia korejaan.
			    	//TODO: Jos joskus tulee käyttäjien kesken jaetut korit
			    	//niin tehdään silloin kuntoon
			    	vm.permissions = {
			    		'muokkaus' : true,
			    		'poisto' : true
			    	};

			    	//Onko käyttäjällä oikeudet tehdä tilamuutoksia?
			    	vm.tilamuutosPermission = false;

			    	vm.updateTilamuutosPermission = function(loydot) {
			    		vm.tilamuutosPermission = false;
			    		for(var i = 0; i < loydot.length; i++) {
			    			if(loydot[i].properties.oikeudet.muokkaus === false) {
			    				return;
			    			}
			    		}
			    		//Yhtään löytöä jota ei saa muokata ei tullut vastaan -> sallitaan tilamuutokset.
			    		vm.tilamuutosPermission = true;
			    	};

			    	// RAK tai ARK puolen kori
			    	vm.mip = mip_alue;

			        angular.extend(vm, ModalControllerService);

                    // Valitun modalin nimi ja järjestysnumero
                    vm.modalNameId = selectedModalNameId;
			        vm.setModalId();
			        vm.entity = 'kori';

			        vm.korityyppi = korityyppi;

			        // Kori valittu kori-välilehdeltä
			        if(kori){
			        	vm.kori = kori;
						vm.koriValittu = true;
						vm.jaetut_kayttajat = kayttajat;
			        }

			        // Hakutuloksella löydetyt id:t.
			        if(koriIdLista){
			        	vm.koriIdLista = koriIdLista;
			        }

			        // Uuden lisäyksessä avaus muokkaukseen
			        if(uusiKori){
			        	vm.uusiKori = true;
			        	vm.edit = true;
			        }else{
			        	vm.edit = false;
			        }

					// korista poistettavat rivit
					vm.poistettavat = [];

			        vm.tilanmuutos = false;
			        $scope.focusInput = false;

			    };
			    vm.setUp();


                /**
                 * Sulkemisruksi.
                 */
                $scope.close = function() {
               		vm.close();
                    $scope.$destroy();
                };

				/**
				 * Peruuta muokkaus.
				 */
				vm._cancelEdit = function () {
                   	vm.edit = false;
					vm.poistettavat = [];

					if(vm.uusia) {
						vm.uusia = null;
						vm.koriIdLista = []
						vm.vanha_id_lista = [];
					}

					// Päivitetään korin sisältö hakemalla uudelleen
                   	if(vm.kori.properties.id){
                   		vm.haeKori(vm.kori.properties.id);
                   	}
 				};

				/**
				 * Muokkaa
				 */
				vm._editMode = function () {
					vm.edit = true;
					$scope.focusInput = true;

					// Päivitetään korin sisältö hakemalla uudelleen
					vm.haeKori(vm.kori.properties.id);
				};

				/**
				 * Hakee korin id:n mukaan
				 */
				vm.haeKori = function (id){
					vm.koriPromise = KoriService.haeKori(id);
					vm.koriPromise.then(function (haettuKori){
						if(haettuKori){
							vm.kori = haettuKori;
							vm.valitseKori(vm.kori);
						}
					}, function(data) {
                        locale.ready('common').then(function() {
                            AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
                        });
                    });
				};

				/**
				 * Korien haku valittavaksi
				 */
				vm.korivalinnat = function (korityyppi){

					// Näytetään valittavat korit
					vm.koriValittu = false;
					vm.showQRCodeButton = true;
					vm.korihaku = true;

		            vm.koriTable = new NgTableParams({
		                page : 1,
		                count : 100,
		                total : 1
		            }, {
		            	counts: [], // piilotetaan paginointi
		                defaultSort : "asc",
		                getData : function($defer, params) {
                            if(vm.promise !== undefined) {
                                vm.cancelRequest();
                            }

							var filterParameters = ListService.parseParameters(params);
                            // Suodatus korityypin id:n mukaan
                            filterParameters['korityyppi'] = korityyppi.properties.id;

                            // Suodatus MIP alueen mukaan RAK tai ARK
                            filterParameters['mip_alue'] = vm.mip;
							filterParameters['korijako'] = 3; //3 = Koriin lisätessä näytetään kaikki korit
                            vm.koritPromise = KoriService.haeKorit(filterParameters);
                            vm.koritPromise.then(function(data) {

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
				};
				// Kori valitaan vain kun ollaan lisäämässä rivejä koriin
		        if(korityyppi && !vm.koriValittu && !vm.uusiKori){
		        	vm.korivalinnat(korityyppi);
		        }

		        /**
		         * Jos lisays koriin, haetaan hakutuloksen mukaiset tiedot ja lisätään ne korin riveiksi.
		         */
				vm.lisaaKoriin = function (kori){

					vm.kori = kori;

					// Lisäyksessä avataan muokkaustilaan
					vm.edit = true;

					if(vm.kori.properties.kori_id_lista != null && vm.kori.properties.kori_id_lista[0] != null){
						vm.vanha_id_lista = vm.kori.properties.kori_id_lista;
					}else{
						vm.vanha_id_lista = [];
					}

                    var uusi_id_lista = [];
                    var uusiaLkm = 0;

                    // Lisäyksessä hakutuloksen id:t lisätään korin id listaan, jos ei vielä löydy
                    if(vm.koriIdLista && vm.koriIdLista.length > 0){
                    	for(var i = 0; i<vm.koriIdLista.length; i++) {
                    		if(vm.vanha_id_lista.indexOf(vm.koriIdLista[i]) === -1) {
                    			uusi_id_lista.push(vm.koriIdLista[i]);
                    			uusiaLkm++;
                    		}
                    	}

                        // Uusien määrä
                        vm.uusia = uusiaLkm;
                    }

                    if(vm.uusia > 0){
                        // Välitetään korille uusien lista
                    	vm.valitseKori(vm.kori, uusi_id_lista);
                    }else{
                        // Korissa on jo samat mitä yritetään lisätä
                        if(vm.kori.properties.korityyppi.taulu === 'ark_loyto'){
                        	AlertService.showInfo(locale.getString('ark.Discoveries_already_in_cart'));
                        }else if(vm.kori.properties.korityyppi.taulu === 'ark_nayte'){
                        	AlertService.showInfo(locale.getString('sample.Samples_already_in_cart'));
                        }else{
                        	AlertService.showInfo(locale.getString('common.Selected_items_already_in_cart'));
                        }
                        vm.uusia = null;
                        vm.edit = false;
                        // avataan kori katselutilaan
                        vm.valitseKori(vm.kori, null);
                    }
				};

		        /**
		         * Korin valinta.
		         * Haetaan korin rivit tyypin mukaan.
		         */
				vm.valitseKori = function (kori, uusi_id_lista){

					if(kori){
						vm.kori = kori;
						var id_lista = [];

						// Lisättäessä koriin tässä tuodaan lisättävät id:t
						if(uusi_id_lista){
							id_lista = uusi_id_lista;
							// resetoidaan input lista heti
							uusi_id_lista = null;
						}else if(vm.kori.properties.kori_id_lista && vm.kori.properties.kori_id_lista[0] != undefined){
							// Korissa jo olevat id:t, ei uusia lisättävänä
	                        id_lista = vm.kori.properties.kori_id_lista;
	                    }

                        // Haetaan tiedot. Korityypillä KoriService päättelee mitä haetaan.
                        var hakuKorityyppi = null;
                        if(kori.properties){
                        	hakuKorityyppi = kori.properties.korityyppi;
                        }else if(kori.korityyppi){
                        	hakuKorityyppi = kori.korityyppi;
                        }
                        // jemmaan
                        vm.korityyppi = hakuKorityyppi;

						// Näytetään korin sisältörivit
						vm.koriValittu = true;

						if (vm.kori.properties.museon_kori == null){
							vm.kori.properties.museon_kori = false;
						}
						vm.jaetut_kayttajat = vm.kori.properties.kayttajat;

						/*
						 *  Luodaan korin tyypin mukainen taulukko. Lisätään uusia tarpeen mukaan.
						 */
						if(vm.korityyppi.taulu == 'ark_loyto'){
				            vm.loytoKoriTable = new NgTableParams({
				                page : 1,
				                count : 25,
				                total : 25
				            }, {
				                defaultSort : "asc",
				                getData : function($defer, params) {
			                        var filterParameters = ListService.parseParameters(params);

				                        if(id_lista.length > 0){

				                        // Parametreihin lisätään id lista
				                        filterParameters['kori_id_lista'] = id_lista;

				                        vm.koriPromise = KoriService.haeKorinTiedot(hakuKorityyppi, filterParameters);
				                        vm.koriPromise.then(function(data) {

				                            // id:t kerätään talteen
				                            vm.koriIdLista = data.idlist;
				                            params.total(data.total_count);

											vm.jaetut_kayttajat = vm.kori.properties.kayttajat;
				                            // tarkista oikeudet
				                            vm.updateTilamuutosPermission(data.features);
				                            $defer.resolve(data.features);

				                        }, function(data) {
				                            locale.ready('common').then(function() {
				                                AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
				                            });
				                            orderedData = [];
				                            $defer.resolve(orderedData);
				                        });
					                } else {
										$defer.resolve([]);
									}
				                }
				            });
						}
						else if(vm.korityyppi.taulu == 'ark_nayte'){
				            vm.nayteKoriTable = new NgTableParams({
				                page : 1,
				                count : 25,
				                total : 25
				            }, {
				                defaultSort : "asc",
				                getData : function($defer, params) {
			                        var filterParameters = ListService.parseParameters(params);

			                        if(id_lista.length > 0){

				                        // Parametreihin lisätään id lista
				                        filterParameters['kori_id_lista'] = id_lista;

				                        vm.koriPromise = KoriService.haeKorinTiedot(hakuKorityyppi, filterParameters);
				                        vm.koriPromise.then(function(data) {

				                            // id:t kerätään talteen
				                            vm.koriIdLista = data.idlist;
				                            params.total(data.total_count);
											// tarkista oikeudet
				                            vm.updateTilamuutosPermission(data.features);
				                            $defer.resolve(data.features);

				                        }, function(data) {
				                            locale.ready('common').then(function() {
				                                AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
				                            });
				                            orderedData = [];
				                            $defer.resolve(orderedData);
				                        });
					                } else {
										$defer.resolve([]);
									}
				                }
				            });
						}else if(vm.korityyppi.taulu == 'kiinteisto'){
				            vm.kiinteistoKoriTable = new NgTableParams({
				                page : 1,
				                count : 25,
				                total : 25
				            }, {
				                defaultSort : "asc",
				                getData : function($defer, params) {
			                        var filterParameters = ListService.parseParameters(params);

			                        if(id_lista.length > 0){

				                        // Parametreihin lisätään id lista
				                        filterParameters['kori_id_lista'] = id_lista;

				                        vm.koriPromise = KoriService.haeKorinTiedot(hakuKorityyppi, filterParameters);
				                        vm.koriPromise.then(function(data) {

				                            // id:t kerätään talteen
				                            vm.koriIdLista = data.idlist;
				                            params.total(data.total_count);

				                            // tarkista oikeudet
				                            vm.updateTilamuutosPermission(data.features);
				                            $defer.resolve(data.features);

				                        }, function(data) {
				                            locale.ready('common').then(function() {
				                                AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
				                            });
				                            orderedData = [];
				                            $defer.resolve(orderedData);
				                        });
					                } else {
										$defer.resolve([]);
									}
				                }
				            });
						}else if(vm.korityyppi.taulu == 'rakennus'){
				            vm.rakennusKoriTable = new NgTableParams({
				                page : 1,
				                count : 25,
				                total : 25
				            }, {
				                defaultSort : "asc",
				                getData : function($defer, params) {
			                        var filterParameters = ListService.parseParameters(params);

			                        if(id_lista.length > 0){

				                        // Parametreihin lisätään id lista
				                        filterParameters['kori_id_lista'] = id_lista;

				                        vm.koriPromise = KoriService.haeKorinTiedot(hakuKorityyppi, filterParameters);
				                        vm.koriPromise.then(function(data) {

				                            // id:t kerätään talteen
				                            vm.koriIdLista = data.idlist;
				                            params.total(data.total_count);

				                            // tarkista oikeudet
				                            vm.updateTilamuutosPermission(data.features);
				                            $defer.resolve(data.features);

				                        }, function(data) {
				                            locale.ready('common').then(function() {
				                                AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
				                            });
				                            orderedData = [];
				                            $defer.resolve(orderedData);
				                        });
					                } else {
										$defer.resolve([]);
									}
				                }
				            });
						}else if(vm.korityyppi.taulu == 'alue'){
				            vm.alueKoriTable = new NgTableParams({
				                page : 1,
				                count : 25,
				                total : 25
				            }, {
				                defaultSort : "asc",
				                getData : function($defer, params) {
			                        var filterParameters = ListService.parseParameters(params);

			                        if(id_lista.length > 0){

				                        // Parametreihin lisätään id lista
				                        filterParameters['kori_id_lista'] = id_lista;

				                        vm.koriPromise = KoriService.haeKorinTiedot(hakuKorityyppi, filterParameters);
				                        vm.koriPromise.then(function(data) {

				                            // id:t kerätään talteen
				                            vm.koriIdLista = data.idlist;
				                            params.total(data.total_count);

				                            // tarkista oikeudet
				                            vm.updateTilamuutosPermission(data.features);
				                            $defer.resolve(data.features);

				                        }, function(data) {
				                            locale.ready('common').then(function() {
				                                AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
				                            });
				                            orderedData = [];
				                            $defer.resolve(orderedData);
				                        });
					                } else {
										$defer.resolve([]);
									}
				                }
				            });
						}else if(vm.korityyppi.taulu == 'arvoalue'){
				            vm.arvoalueKoriTable = new NgTableParams({
				                page : 1,
				                count : 25,
				                total : 25
				            }, {
				                defaultSort : "asc",
				                getData : function($defer, params) {
			                        var filterParameters = ListService.parseParameters(params);

			                        if(id_lista.length > 0){

				                        // Parametreihin lisätään id lista
				                        filterParameters['kori_id_lista'] = id_lista;

				                        vm.koriPromise = KoriService.haeKorinTiedot(hakuKorityyppi, filterParameters);
				                        vm.koriPromise.then(function(data) {

				                            // id:t kerätään talteen
				                            vm.koriIdLista = data.idlist;
				                            params.total(data.total_count);

											// tarkista oikeudet
				                            vm.updateTilamuutosPermission(data.features);
				                            $defer.resolve(data.features);

				                        }, function(data) {
				                            locale.ready('common').then(function() {
				                                AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
				                            });
				                            orderedData = [];
				                            $defer.resolve(orderedData);
				                        });
					                } else {
										$defer.resolve([]);
									}
				                }
				            });
						}
					}
				};

				/*
				 * Kun tullaan kori-välilehdeltä on kori jo valittu ja haetaan sille rivit, jos löytyy
				 */
				if(vm.kori && vm.kori.properties.kori_id_lista && !uusiKori){
					// Avataan katselutilaan
					vm.valitseKori(vm.kori);
				}

				/*
				 * Rivin poisto korista. Merkitään rivi poistettavaksi. Poistetaan rivit vasta korin tallennuksessa.
				 */
				vm.poistaRivi = function (data, rivi){

					var strId = data.properties.id.toString();

					vm.poistettavat.push(strId);

					if(vm.uusia){
						vm.uusia--;
					}
				};

				/*
				 * Poistetaan teksti näkyviin
				 */
				vm.poistettuRivi = function (data){
					var strId = data.properties.id.toString();

					var ind = vm.poistettavat.indexOf(strId);
					if(ind > -1) {
						return true;
					} else {
						return false;
					}
				};

				/**
				 * Tallenna
				 */
                vm.save = function () {
                	vm.disableButtons = true;

					// Poistettavien listan läpikäynti.
					if(vm.poistettavat.length > 0) {
						//Varmistetaan, että molemmat ovat samaa tyyppiä (str)
						var idLista = angular.copy(vm.koriIdLista);
						for(var i = 0; i<idLista.length; i++) {
							idLista[i] = idLista[i].toString();
						}

						for(var d = 0; d < vm.poistettavat.length; d++) {
							var ind = idLista.indexOf(vm.poistettavat[d]);
							if(ind !== -1) {
								idLista.splice(ind, 1);
							}
						}

						// jäljelle jääneet
						vm.koriIdLista = idLista;
						vm.poistettavat = [];
					}

                    // Korin id listan päivitys ennen tallennusta. Jos lisätty uusia otetaan myös vanhat mukaan.
                    if(vm.vanha_id_lista){
                    	for(var i = 0; i<vm.vanha_id_lista.length; i++){
                    		if(vm.koriIdLista.indexOf(vm.vanha_id_lista[i]) === -1) {
                    			vm.koriIdLista.push(vm.vanha_id_lista[i]);
                    		}
                    	}
                    }

					// kantaan viedään null, jos ei ole rivejä
					if(null != vm.koriIdLista && vm.koriIdLista.length < 1){
						vm.koriIdLista = null;
					}

                    vm.kori.properties.kori_id_lista = vm.koriIdLista;
					if (vm.jaetut_kayttajat){
						vm.jaettu = vm.jaetut_kayttajat.map(function(u) {
							return u.id;
						});
					}
					if (!vm.kori.properties.museon_kori){
						vm.kori.properties.museon_kori = false;
					}

                    KoriService.luoTallennaKori(vm.kori, vm.jaettu).then(function success(kori) {

                        AlertService.showInfo(locale.getString('common.Save_ok'), "");

                        // Päivitetään taulukko
    			        vm.valitseKori(kori, null);

                        vm.disableButtons = false;

                    	// Katselutila päälle
                    	vm.edit = false;
                    	vm.uusiKori = false;
                    	vm.uusia = null;
                    	vm.vanha_id_lista = []; // vanhan listan resetointi
						nykyinen = UserService.getProperties().user.id;

						if (kori.properties.luoja.id != nykyinen){
							permission = kori.properties.kayttajat.filter(function(u) {
								return u.id==nykyinen;
							});
							if (permission.length == 0 && kori.properties.museon_kori == false){
								vm.close();
							}

						}
                    }, function error (kori) {
                        AlertService.showError(locale.getString('common.Error'), AlertService.message(kori));
                        vm.disableButtons = false;
                    });
                };

                /**
                 * Korin poisto.
                 */
                vm.poistaKori = function (){

                    var conf = confirm(locale.getString('common.Confirm_delete_cart'));
                    if (conf) {
                    	KoriService.poistaKori(vm.kori.properties.id).then(function() {
                            vm.close();
                            $scope.$destroy();
                            locale.ready('common').then(function() {
                                AlertService.showInfo(locale.getString('common.Deleted'));
                            });
                        }, function error(data) {
                            locale.ready('common').then(function() {
                                AlertService.showError(locale.getString('common.Delete_fail'), AlertService.message(data));
                            });
                        });
                    }
                };

    			/*
    			 * Avaa löytö katselutilaan
    			 */
    			vm.avaaLoyto = function(valittu_loyto) {
                	LoytoService.haeLoyto(valittu_loyto.properties.id).then(function(loyto) {
                		EntityBrowserService.setQuery('loyto', loyto.properties.id, {'kori': vm.kori.properties, 'kori_id_lista': vm.kori.properties.kori_id_lista}, vm.kori.properties.kori_id_lista.length);
                		ModalService.loytoModal(loyto, false);
    				});
    			};

    			/*
    			 * Avaa näyte katselutilaan
    			 */
    			vm.avaaNayte = function(valittu_nayte) {
                	NayteService.haeNayte(valittu_nayte.properties.id).then(function(nayte) {
                		EntityBrowserService.setQuery('nayte', nayte.properties.id, {'kori': vm.kori.properties, 'kori_id_lista': vm.kori.properties.kori_id_lista}, vm.kori.properties.kori_id_lista.length);
                		ModalService.nayteModal(nayte, false);
    				});
    			};

    			/*
    			 * Avaa kiinteistö katselutilaan
    			 */
    			vm.avaaKiinteisto = function(valittu_kiinteisto) {
                    KiinteistoService.fetchKiinteisto(valittu_kiinteisto.properties.id).then(function(kiinteisto) {
                        EntityBrowserService.setQuery('kiinteisto', kiinteisto.properties.id, {'kori': vm.kori.properties, 'kori_id_lista': vm.kori.properties.kori_id_lista}, vm.kori.properties.kori_id_lista.length);
                        ModalService.kiinteistoModal(kiinteisto, null);
                    });
    			};

    			/*
    			 * Avaa rakennus katselutilaan
    			 */
    			vm.avaaRakennus = function(valittu_rakennus) {
                    RakennusService.fetchRakennus(valittu_rakennus.properties.id).then(function(rakennus) {
                        EntityBrowserService.setQuery('rakennus', rakennus.properties.id, {'kori': vm.kori.properties, 'kori_id_lista': vm.kori.properties.kori_id_lista}, vm.kori.properties.kori_id_lista.length);
                        ModalService.rakennusModal(true, rakennus, null, null);
                    });
    			};

    			/*
    			 * Avaa alue katselutilaan
    			 */
    			vm.avaaAlue = function(valittu_alue) {
    				AlueService.fetchAlue(valittu_alue.properties.id).then(function(alue) {
                        EntityBrowserService.setQuery('alue', alue.properties.id, {'kori': vm.kori.properties, 'kori_id_lista': vm.kori.properties.kori_id_lista}, vm.kori.properties.kori_id_lista.length);
                        ModalService.alueModal(true, alue);
                    });
    			};

    			/*
    			 * Avaa alue katselutilaan
    			 */
    			vm.avaaArvoalue = function(valittu_arvoalue) {
    				ArvoalueService.fetchArvoalue(valittu_arvoalue.properties.id).then(function(arvoalue) {
                        EntityBrowserService.setQuery('arvoalue', arvoalue.properties.id, {'kori': vm.kori.properties, 'kori_id_lista': vm.kori.properties.kori_id_lista}, vm.kori.properties.kori_id_lista.length);
                        ModalService.arvoalueModal(true, arvoalue);
                    });
    			};

                /**
                 * Taulukon kolumnien tekstien haku
                 */
                vm.getColumnName = function(column, lang_file) {
                    var str;

                    if (lang_file) {
                        str = lang_file + '.' + column;
                    } else {
                        str = 'common.' + column;
                    }
                    return locale.getString(str);
                }

/*
                 * Create a QR Code report
                 */
				vm.createQRCodeReport = function() {
					sessionStorage.setItem("korinimi", vm.kori.properties.nimi);
					if(vm.kori.properties.korityyppi.taulu == 'ark_loyto'){
						sessionStorage.setItem("koridata", JSON.stringify(vm.loytoKoriTable.data));
					}
					if(vm.kori.properties.korityyppi.taulu == 'ark_nayte'){
						sessionStorage.setItem("koridata", JSON.stringify(vm.nayteKoriTable.data));
					}
					window.open("korit/partials/qrcode_report.html", "_blank");
				};

				// Tutkijat ja pääkäyttäjät valintalista
				vm.kayttajat = [];
				vm.valittu_kayttaja = {};
				vm.getUsers = function () {
					UserService.getUsers({
						'rivit': 10000,
						'aktiivinen': true
					}).then(function success(data) {
						vm.kayttajat = data.features;
					}, function error(data) {
						locale.ready('error').then(function () {
							AlertService.showError(locale.getString("error.Getting_users_failed"), AlertService.message(data));
						});
					});
				};
				vm.getUsers();


				vm.addUser = function(selected) {
					if (vm.jaetut_kayttajat != null){
						vm.jaetut_kayttajat.push(selected.properties);
					}
					else{
						vm.jaetut_kayttajat = [selected.properties];
					}
				};
				vm.printQRCode= function() {
					sessionStorage.setItem("tunniste", vm.kori.properties.nimi);
					window.open("pages/templates/qrcode_printpage.html", "_blank");
				};

                /*
                 * Create a report
                 * type: PDF / WORD / EXCEL ...
                 * mode: loyto / poistetut_loydot
                 */
                vm.createReport = function(type, mode) {
                	if(type === 'WORD'){
                        //Asetetaan raportin "nimi" joka näkyy mm. raportit-välilehdellä
                        //Raportin nimi + tutkimuksen nimi
                        var reportDisplayName = locale.getString('ark.Indexing_cards');

                        var report = {'loyto_idt': vm.koriIdLista, 'requestedOutputType': type, 'reportDisplayName': reportDisplayName};
                        RaporttiService.createRaportti('Loyto_luettelointikortit', report).then(function success(data) {
                            AlertService.showInfo(locale.getString('common.Report_request_created'));
                        }, function error(data) {
                            AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                        });
                	}else if(type === 'EXCEL'){
                		ModalService.raporttiModal(vm.kori.properties.id, vm.korityyppi);
                	}
                };

                /*
                 * Löytöjen tilan muutos
                 */
                vm.muutaLoydonTila = function (){
                	vm.haeKori(vm.kori.properties.id);

                	// Luodaan objekti tietojen välitystä varten
									// Default arvo: Kokoelmassa
                	vm.loyto = {
                			'properties' : {
                				'loydon_tila': {id: 6, nimi_fi: 'Kokoelmassa'},
                				'tapahtumapaiva': null,
                				'tilan_kuvaus': ''
                			}
                	};
                	if(vm.loyto.properties.loydon_tila.id != 7) {
                		vm.loyto.properties.tapahtumapaiva = new Date();
                	}
                	vm.disableButtons = true;
					vm.tilanmuutos = true;

					$timeout(function() {
						document.getElementById("popover_tila").click();
					}, 250);
                };

                $scope.$watch('vm.loyto.properties.loydon_tila', function(newV, oldV) {
					if(newV != oldV) {
                		//Tehdään ensin kentistä tyhjät, ettei päivitetä arvoja joita ei uissa näy, mutta joissa kuitenkin on arvot
    					vm.loyto.properties.sailytystila = null;
    					vm.loyto.properties.vakituinen_hyllypaikka = null;
    					vm.loyto.properties.tilapainen_sijainti = null;
    					vm.loyto.properties.loppupvm = null;
    					vm.loyto.properties.lainaaja = null;
    					vm.loyto.properties.tilan_kuvaus = null;

                		if(newV.id == 7) {
                			vm.loyto.properties.tapahtumapaiva = null;
                		} else {
                			vm.loyto.properties.tapahtumapaiva = new Date();
                		}
	                }
                }, true);
                /*
                 * Näytteiden tilan muutos
                 */
                vm.muutaNaytteenTila = function (){
                	vm.haeKori(vm.kori.properties.id);

                	// Luodaan objekti tietojen välitystä varten
                	vm.nayte = {
                			'properties' : {
                				'tila': '',
                				'tapahtumapaiva': new Date(), // oletus kuluva pvm
                				'tilan_kuvaus': ''
                			}
                	};
                	vm.disableButtons = true;
					vm.tilanmuutos = true;
                };

                $scope.$watch('vm.nayte.properties.tila', function(newV, oldV) {
                	if(newV != oldV) {

                		//Tehdään ensin kentistä tyhjät, ettei päivitetä arvoja joita ei uissa näy, mutta joissa kuitenkin on arvot
    					vm.nayte.properties.sailytystila = null;
    					vm.nayte.properties.vakituinen_hyllypaikka = null;
    					vm.nayte.properties.tilapainen_sijainti = null;
    					vm.nayte.properties.loppupvm = null;
    					vm.nayte.properties.lainaaja = null;
    					vm.nayte.properties.tilan_kuvaus = null;

                		if(newV.id == 5) {
                			vm.nayte.properties.tapahtumapaiva = null;
                		} else {
                			vm.nayte.properties.tapahtumapaiva = new Date();
                		}
	                }
                }, true);

                /*
                 * Peruuta tilan muutos
                 */
                vm.peruutaTilanMuutos = function (){
                	vm.disableButtons = false;
					vm.tilanmuutos = false;
                };

                /*
                 * Tehdään kaikille korissa oleville löydöille tilan muutos.
                 */
                vm.teeTilanMuutos = function (){
                	if(vm.korityyppi.taulu === 'ark_loyto'){
						if (vm.loyto.properties.laatikko && vm.loyto.properties.laatikko.length > 0){
							vm.loyto.properties.vakituinen_hyllypaikka += "." + vm.loyto.properties.laatikko;
						}

                    	LoytoService.teeKorinTilamuutosTapahtumat(vm.kori.properties.kori_id_lista, vm.loyto).then(function(data) {

                    		AlertService.showInfo(locale.getString('ark.Discoveries_status_changed'), vm.loyto.properties.loydon_tila.nimi_fi);
                    		// Taulukko päivitetään
                    		vm.valitseKori(vm.kori);

                    		vm.disableButtons = false;
                        	vm.tilanmuutos = false;
        				}, function error(data) {
        					locale.ready('common').then(function() {
                                AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                                vm.disableButtons = false;
                            });
        				});
                	}
                	else if(vm.korityyppi.taulu === 'ark_nayte'){
						if (vm.nayte.properties.laatikko && vm.nayte.properties.laatikko.length > 0){
							vm.nayte.properties.vakituinen_hyllypaikka += "." + vm.nayte.properties.laatikko;
						}

                    	NayteService.teeKorinTilamuutosTapahtumat(vm.kori.properties.kori_id_lista, vm.nayte).then(function(data) {

                    		AlertService.showInfo(locale.getString('sample.Sample_status_changed'), vm.nayte.properties.tila.nimi_fi);
                    		// Taulukko päivitetään
                    		vm.valitseKori(vm.kori);

                    		vm.disableButtons = false;
                        	vm.tilanmuutos = false;
        				}, function error(data) {
        					locale.ready('common').then(function() {
                                AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
                                vm.disableButtons = false;
                            });
        				});
                	}

                };

                $scope.currentLocale = locale.getLocale();

                /**
                 * DEBUG
                 */
				hotkeys.bindTo($scope).add({
					combo : 'ä',
					description : 'vm.features',
					callback : function () {
						console.log(angular.copy(vm.loyto.properties));
					}
				});

				$scope.haeKoriNimella = function(nimi) {
					if (nimi.length > 0) {
						if (nimi.indexOf('http') === -1 && nimi.indexOf('www.') === -1){
							KoriService.haeKorit({'nimi':nimi,'mip_alue':'ARK'}).then(function(data){
								if (data.count > 1) {
									AlertService.showError(locale.getString('common.Error'), locale.getString('error.Too_many_baskets'));
									$scope.scannerText = '';
								}
								else if(data.count === 0){
									AlertService.showError(locale.getString('common.Error'), 'Virheellinen korin nimi: ' + nimi);
									$scope.scannerText = '';
								}
								else if(data['features'][0].properties.korityyppi_id!=vm.korityyppi.properties.id){
									AlertService.showError(locale.getString('common.Error'), locale.getString('error.Wrong_cart_type',{
										korityyppi_fi : vm.korityyppi.properties.nimi_fi,
										korityyppi_se : vm.korityyppi.properties.nimi_se,
										korityyppi_eng : vm.korityyppi.properties.nimi_en
									}));
									$scope.scannerText = '';
								}
								else{
									vm.lisaaKoriin(data['features'][0]);
									$scope.scannerText = '';
									}
							},function error(error) {
								console.log(error);
								AlertService.showError(locale.getString('common.Error'), AlertService.message(error) + ' ' + nimi);
							});
						}
					}
				};

				// Event for successful QR code reading
				$scope.onSuccess = function (data) {
					//console.log(data);
					$scope.scannerText = data;
					this.$hide();

					if (vm.korihaku){
						$scope.haeKoriNimella(data);
					}
					else
					{
						$scope.asetaTila(data);
					}
				}

				$scope.asetaTila = function(data) {
					// Parsitaan data
					try {
						var splittedText = data.split('&');

						var sailytyspaikka = splittedText[0].split('=')[1];
						var sailytystila = splittedText[1].split('=')[1];
						var hyllypaikka = splittedText[2].split('=')[1];
					} catch (err) {
						AlertService.showError(locale.getString('common.Error'), 'Sijaintikoodi on virheellinen: ' + data);
						return;
					}

					var tilaAsetettu = false;
					var sailytysTilaHakusana = (sailytyspaikka + ' ' + sailytystila).trim();
					// Hae sailytystilat
					ListService.getOptions('ark_sailytystila').then(function success(options) {
						for (var i = 0; i < options.length; i++) {
							if (options[i].nimi_fi == sailytysTilaHakusana) {
								// Asetetaan tilaksi se jonka nimi mätsää sailytyspaikka+sailytystila arvoon
								vm.loyto.properties.sailytystila = options[i];
								tilaAsetettu = true;
							}
							if(tilaAsetettu) {
								break;
							}
						}

						if(!tilaAsetettu) {
							AlertService.showError(locale.getString('common.Error'), 'Sijaintia ei löydy: ' + sailytyspaikka + ' ' + sailytystila);
						}

					}, function error(data) {
							locale.ready('error').then(function() {
									// TODO
									// AlertService.showError(locale.getString("error.Getting_culturohistorical_values_failed"), AlertService.message(data));
									console.log(data);
							});
					});

					// Asetetaan hyllypaikaksi hyllypaikka
					vm.loyto.properties.vakituinen_hyllypaikka = hyllypaikka;
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

				vm.addEntityToBasket = function(id){
					vm.koriIdLista = [id];
					vm.lisaaKoriin(vm.kori);
				};
			}
		]);
