/*
 * Löytö UI controller
 */
angular.module('mip.nayte').controller(
		'NayteController',
		[
			'$scope', '$rootScope', 'TabService', '$location', '$filter',
			'CONFIG', 'AlertService', 'ModalService', 'ListService', 'locale', 'permissions',
			'olData', 'hotkeys', '$timeout', 'UserService', 'NgTableParams', 'NayteService', '$popover',
			'selectedModalNameId', 'ModalControllerService', 'nayte', 'isCreate', 'TutkimusService', 'YksikkoService',
			'EntityBrowserService', 'FileService', 'KarttaService', 'RontgenkuvaService', 'TutkimusalueService',
			function ($scope, $rootScope, TabService, $location, $filter,
			        CONFIG, AlertService, ModalService, ListService, locale, permissions,
			        olData, hotkeys, $timeout, UserService, NgTableParams, NayteService, $popover,
			        selectedModalNameId, ModalControllerService, nayte, isCreate, TutkimusService, YksikkoService,
			        EntityBrowserService, FileService, KarttaService, RontgenkuvaService, TutkimusalueService) {

			    var vm = this;

			    /**
			     * Controllerin set-up.
			     */
			    vm.setUp = function() {

			        angular.extend(vm, ModalControllerService);

                    // Valitun modalin nimi ja järjestysnumero
                    vm.modalNameId = selectedModalNameId;
			        vm.setModalId();
			        vm.entity = 'nayte';

                    // Valittu loyto
                    if (nayte) {
                        vm.nayte = nayte;
                        vm.yksikko = nayte.properties.yksikko;

                        if(nayte.properties.tutkimus) {
                        	vm.tutkimus = nayte.properties.tutkimus;
                        } else if (nayte.properties.yksikko){
                        	vm.tutkimusalue = nayte.properties.yksikko.tutkimusalue;
                        	vm.tutkimus = vm.tutkimusalue.tutkimus;
                        } else if(nayte.properties.tutkimusalue){ //IRTOLÖYTÖ
                        	vm.tutkimusalue = nayte.properties.tutkimusalue;
                        	vm.tutkimus = vm.tutkimusalue.tutkimus;
                        }

                        //Tallennetaan alkuperäinen mahdollisen peruuttamisen vuoksi
                        vm.original = angular.copy(vm.nayte);
                        // Modaalin avauksessa välitetään onko uuden avaus kyseessä
                        vm.create = isCreate;
                        vm.edit = isCreate;
                    }

                    // Oikeudet
                    vm.permissions = permissions;

	   			     // Konservointi näytetään vain tutkijalle ja pääkäyttäjälle
	   			     var props = UserService.getProperties();
	   			     vm.rooli = props.user.ark_rooli;
	   			     vm.konservointi_oikeus = false;
	   			     if(vm.rooli === 'tutkija' || vm.rooli === 'pääkäyttäjä'){
	   			    	 vm.konservointi_oikeus = true;
	   			     }

                    //Asetetaan focus muokkaustilaan mentäessä
                    if(vm.edit) {
                    	$scope.focusInput = true;

                    } else {
                    	$scope.focusInput = false;
                    }

                    //Muutetaan str numeroksi
                    if(vm.nayte.properties.ark_tutkimusalue_id) {
                    	vm.nayte.properties.ark_tutkimusalue_id = parseInt(vm.nayte.properties.ark_tutkimusalue_id);
                    }
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
					vm.create = false;
					vm.nayte = angular.copy(vm.original);
 				};

				/**
				 * Muokkaa näytettä
				 */
				vm._editMode = function () {
					vm.original = angular.copy(vm.nayte);
					vm.edit = true;

	                if(vm.nayte.properties.naytekoodi){
						// Hae näytekoodin mukaiset näytetyypit valintalistalle
						vm.haeNaytetyypit(vm.nayte.properties.naytekoodi);
	                }
	                // tilan muutoksen pvm ja kuvaus-kenttä piiloon
	                vm.tilanmuutos = false;
	                // oletus input
					$scope.focusInput=true;

					// Koordinaattikenttien enable/disable
					vm.validoiKeskipisteKoordinaatit();
					vm.validoiMinMaxKoordinaatit();
				};

				/*
				 * Tilaa vaihdetaan
				 */
				vm.avaaTilanMuutosKentat = function (){
					// Tehdään ensin kentistä tyhjät, ettei päivitetä arvoja joita ei uissa näy, mutta joissa kuitenkin on arvot
					// Paitsi sijaintiin liittyvät kentät.
					// vm.nayte.properties.sailytystila = null;
					// vm.nayte.properties.vakituinen_hyllypaikka = null;
					// vm.nayte.properties.tilapainen_sijainti = null;
					vm.nayte.properties.loppupvm = null;
					vm.nayte.properties.lainaaja = null;
					vm.nayte.properties.tilan_kuvaus = null;

					// Tilan muutoksen pvm eli tapahtumapäivä
					// Lainassa tila -> ei defaultata tähän päivään, tyhjätään mitä ikinä kentässä onkaan
					if(vm.nayte.properties.tila.id == 5) {
						vm.nayte.properties.tapahtumapaiva = null;
					} else {
						vm.nayte.properties.tapahtumapaiva = new Date();
					}

					vm.tilanmuutos = true;
					//Välitetään bäkkärille implisiittisesti tieto
					//tehdystä tilamuutoksesta
					vm.nayte.properties._tilanmuutos = true;
				};

                /*
                 * Näytteen tapahtumat taulu
                 */
				if(!vm.nayte.properties.tapahtumat){
					vm.nayte.properties.tapahtumat = [];
				}
                vm.naytteenTapahtumatTable = new NgTableParams({
                	page : 1,
                    count : 15,
                    total : 15}
                	, {
                		getData : function($defer, params) {
                            params.total(vm.nayte.properties.tapahtumat.length);
                            $defer.resolve(vm.nayte.properties.tapahtumat);
                		}
                	});


				/**
				 * Tallenna näyte
				 */
                vm.save = function () {
									if($scope.form.$invalid) {
										return;
								  }
                	vm.disableButtons = true;

                	// Asetetaan luettelointinumeron alanumero, jos alanumero-kentässä ei ole käyty
                	if(!$scope.form.alanumero.$touched){
                    	// Luettelointinumeroon lisätään syötetty loppuosa
                   		vm.nayte.properties.luettelointinumero = vm.luettelointinumero.concat(vm.nayte.properties.alanumero);
                	}


                    NayteService.luoTallennaNayte(vm.nayte).then(function (nayte) {

                        // "update" the original after successful save
                        vm.original = angular.copy(vm.nayte);

                        // Päivitetty näyte
                        vm.nayte = nayte;

                        //Muutetaan str numeroksi
                        if(vm.nayte.properties.ark_tutkimusalue_id) {
                        	vm.nayte.properties.ark_tutkimusalue_id = parseInt(vm.nayte.properties.ark_tutkimusalue_id);
                        }

                        AlertService.showInfo(locale.getString('common.Save_ok'), "");

                        vm.disableButtons = false;

                    	// Katselutila päälle
                    	vm.edit = false;
                    	vm.create = false;

                    	EntityBrowserService.setQuery('nayte', nayte.properties.id, {'nayte_id': nayte.properties.id}, 1);

                    	// Tapahtuma taulukon päivitys
                    	vm.naytteenTapahtumatTable.reload();

                    }, function error () {
                        AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
                        vm.disableButtons = false;
                    });
                };

                /**
                 * Avaa linkistä valitun tutkimuksen omaan ikkunaan
                 */
                vm.avaaTutkimus = function(){
					TutkimusService.haeTutkimus(vm.tutkimus.id).then(function(tutkimus) {
						EntityBrowserService.setQuery('tutkimus', tutkimus.properties.id, {'tutkimus_id': tutkimus.properties.id}, 1);
						ModalService.tutkimusModal(true, tutkimus, null);
					});
                };

                /**
                 * Avaa linkistä valitun yksikön omaan ikkunaan
                 */
                vm.avaaYksikko = function(){
                	YksikkoService.haeYksikko(vm.yksikko.id).then(function(yksikko) {
                		ModalService.yksikkoModal(yksikko, vm.tutkimusalue, vm.permissions);
					});
                };

                /**
                 * Tarkistaa löytyykö tutkimukselta syötetty yksikkö. Jos yksikkö vaihdetaan päivitetään luettelointinumero.
                 */
                vm.yksikkoLoytyy = true;
                vm.tarkistaYksikko = function (form){

                	YksikkoService.haeTutkimuksenYksikko(vm.tutkimus.id, vm.yksikko.yksikkotunnus).then(function (yksikko){

                		// Asetetaan löydölle valittu yksikkö ja tutkimus
                		if(yksikko){
                			vm.yksikko = yksikko;
                			vm.nayte.properties.yksikko = yksikko;
                			vm.nayte.properties.ark_tutkimusalue_yksikko_id = yksikko.id;
							form.yksikkotunnus.$setValidity('yksikkotunnus_ok', true);
							vm.yksikkoLoytyy = true;

							// Päivitä luettelointinumero ja hae seuraava vapaa alanumero. Näytekoodi pitää olla valittuna.
							if(vm.nayte.properties.naytekoodi){
								vm.muodostaLuettelointinumero();
								vm.haeNaytteenAlanumero();
							}

                		}else{
                			// Ei löytynyt
                			form.yksikkotunnus.$setValidity('yksikkotunnus_ok', false);
   							vm.yksikkoLoytyy = false;

                		}
                	});
                };

                /*
                 * Näytekoodi valintalistan temput
                 */
                vm.vaihdaNaytekoodi = function (naytekoodi, form){

                	vm.nayte.properties.naytekoodi = naytekoodi;

					if(vm.yksikkoLoytyy){
						// Päivitä luettelointinumero ilman juoksevaa numeroa. Yksikkö pitää olla validi.
						vm.muodostaLuettelointinumero();

	                	vm.uniikkiNumero = true;
	                	form.alanumero.$setValidity('kaytossa', true);

						// Hakee uuden alanumeron
						vm.haeNaytteenAlanumero();

						// Tyhjennetään näytekoodista riippuvat kentät
						vm.alustaNaytekoodinKentat();

						// Hae näytekoodin mukaiset näytetyypit valintalistalle
						vm.haeNaytetyypit(naytekoodi);
					}
                };

                /*
                 * Muodosta luettelointinumero
                 */
                vm.muodostaLuettelointinumero = function(){

                	/* Luettelointinumero muodostuu kolmesta kentästä:
                	 * 1. kokoelmatunnus (TMK tai TYA) + näytteiden päänumero (tutkimukselta)
                	 * 2. näytekoodi + yksikkötunnus ilman yksikkötyypin kirjainta
                	 * 3. juokseva alanumero (per näytekoodi, ilman etunollia)
                	 * Paitsi irtolöytötutkimuksen ja tarkastustutkimuksen näytteellä, sillä ei ole yksikköä ollenkaan.
                	 */
                	vm.luettelointinumero = '';

									var kokoelmaTunnus = vm.tutkimus.nayte_kokoelmalaji.tunnus;
									if(!kokoelmaTunnus) {
											AlertService.showError(locale.getString('common.Error'), 'Kokoelman tunnusta ei ole syötetty');
									}

                	if(!vm.tutkimus.loyto_paanumero){
                		AlertService.showError(locale.getString('common.Error'), locale.getString('ark.Discovery_main_number_missing'));
                		return;
                	};
                	if(!vm.tutkimus.nayte_paanumero){
                		AlertService.showError(locale.getString('common.Error'), locale.getString('ark.Sample_main_number_missing'));
                		return;
                	};

                	//Otetaan tutkimuslaji erikseen, jotta sen tarkastelu on hieman helpompaa
                	var tlaji_id = null;
                	if(vm.tutkimus.ark_tutkimuslaji_id) {
                		tlaji_id = vm.tutkimus.ark_tutkimuslaji_id;
                	} else if (vm.tutkimus.tutkimuslaji && vm.tutkimus.tutkimuslaji.id) {
                		tlaji_id = vm.tutkimus.tutkimuslaji.id;
                	}

                	if(tlaji_id != 6 && tlaji_id != 11 && vm.yksikkoLoytyy){
                    	if(vm.tutkimus.nayte_kokoelmalaji && vm.tutkimus.nayte_paanumero){
												var ltn_alku = kokoelmaTunnus.concat(vm.tutkimus.nayte_paanumero).concat(':');
												var ltn_loppu = vm.nayte.properties.naytekoodi.koodi.concat(vm.yksikko.yksikon_numero);
												vm.luettelointinumero = ltn_alku.concat(ltn_loppu).concat(':');
                    	}
                	}
                	// Irtolöytö tai tarkastus
                	else if(tlaji_id == 6 || tlaji_id == 11) {
										var ltn_alku = kokoelmaTunnus.concat(vm.tutkimus.nayte_paanumero).concat(':') + vm.nayte.properties.naytekoodi.koodi + ":";
										vm.luettelointinumero = ltn_alku;
                	}
									else {
										AlertService.showError(locale.getString('common.Error'), 'Luettelointinumeron luonti näytteelle ei onnistu. Päänumero tai kokoelmalajin tunnus puuttuu. Muussa tapauksessa ota yhteys ylläpitoon.');
                		return;
									}
                };

                // Olemassa olevan luettelointinumeron pilkonta display only osaan ja alanumeroon
                if(vm.nayte.properties.luettelointinumero){
                	vm.muodostaLuettelointinumero();
                }

                /**
                 * Näytekoodin mukaisten näytetyyppien haku
                 */
                vm.haeNaytetyypit = function (naytekoodi){

                    NayteService.haeNaytetyypit(naytekoodi.id).then(function (data) {

                        if(data){
                        	vm.nayte.properties.naytekoodi = naytekoodi;
                        	vm.naytetyypit = data.properties.naytetyypit;

                        	// Luunäytekoodilla on vain yksi näytetyyppi joka asetetaan aina valmiiksi.
                        	if(naytekoodi.koodi === 'LN'){
                        		vm.nayte.properties.naytetyyppi = data.properties.naytetyypit[0];
                        	}
                        }

                      }, function error () {
                          AlertService.showError(locale.getString('common.Error'), locale.getString('sample.Fetching_sample_types_failed'));
                      });

                };

                /**
                 * Jos näytetyyppi muu kuin Dendro niin tyhjennetään luokitus-kenttä.
                 */
                vm.vaihdaNaytetyyppi = function (naytetyyppi){
                	if(!naytetyyppi || naytetyyppi.id != 2 ){
                		vm.nayte.properties.luokka = null;
                	}
                };

                /**
                 * Hae näytteen seuraava alanumero tutkimuksen ja näytekoodin mukaan.
                 */
                vm.haeNaytteenAlanumero = function (){
                    NayteService.haeNaytteenAlanumero(vm.tutkimus.id, vm.nayte.properties.naytekoodi.id).then(function (uusi_alanumero) {

                        if(uusi_alanumero.properties){
                        	vm.nayte.properties.alanumero = uusi_alanumero.properties;
                        }

                      }, function error () {
                          AlertService.showError(locale.getString('common.Error'), locale.getString('sample.Fetching_listing_number_failed'));
                      });
                };

				/**
				 * Luettelointinumeron on oltava uniikki.
				 */
				vm.uniikkiNumero = true;
				vm.tarkistaNumero = function (form) {

                	// Luettelointinumeroon lisätään syötetty loppuosa
               		vm.nayte.properties.luettelointinumero = vm.luettelointinumero.concat(vm.nayte.properties.alanumero);

					if(vm.nayte.properties.luettelointinumero){
						var available = NayteService.tarkistaLuettelointinumero(vm.nayte.properties.luettelointinumero).then(function success (data) {
							if (data) {
								form.alanumero.$setValidity('kaytossa', true);
								vm.uniikkiNumero = true;
								vm.disableButtons = false;
							} else {
								form.alanumero.$setValidity('kaytossa', false);
								vm.uniikkiNumero = false;
							}
						});
						return available;
					}
				};

                /**
                 * Uuden näytteen lisääminen samalle yksikölle
                 */
                vm.uusiNayteYksikolle = function (){
                	var naytteen_tila = {
                    		'id': 4,
                    		'nimi_fi': 'Luetteloitu'
                    	};
                        $scope.focusInput4 = true;
                        // Uudelle näytteelle laitetaan yksikön id viittaus ja muut oletusarvot
                    	vm.uusiNayte = {
                    			'properties' : {
                    				'ark_tutkimusalue_yksikko_id': vm.yksikko.id,
                                    'yksikkotunnus': vm.yksikko.yksikkotunnus,
                                    'ark_tutkimus_id': vm.tutkimus.id,
                    				'ark_nayte_tila_id': 4,
                    				'tila': naytteen_tila,
                    				'naytetta_jaljella': true,
                    				'tutkimus': vm.tutkimus,
                    				'yksikko': vm.yksikko,
                    				'ark_naytekoodi_id': null,
                    				'luettelointinumero': null,
                    				'naytekoodi': null
                    			}
                    	};
                        // Avataan näyte tietojen syöttöön
                        ModalService.nayteModal(vm.uusiNayte, true);
                };

                /*
                 * Näytekoodin vaihtamisella tyhjennetään kenttiä
                 */
                vm.alustaNaytekoodinKentat = function (){
                	vm.nayte.properties.laboratorion_arvio = null;
                	vm.nayte.properties.luokka = null;
                	vm.nayte.properties.luunayte_maara = null;
                	vm.nayte.properties.luunayte_maara_yksikko = null;
                	vm.nayte.properties.maanayte_maara = null;
                	vm.nayte.properties.talteenottotapa = null;
                	vm.nayte.properties.rf_naytteen_koko = null;
                };

                /**
                 * Avaa valitun tapahtuman omaan ikkunaan
                 */
                vm.avaaTapahtuma = function (tapahtuma){
                	ModalService.nayteTapahtumaModal(tapahtuma, vm.nayte);
                };

                /*
                 *  Ajoitusnäytteen luokat
                 */
                vm.ajoitusluokat = [
            		{id : 1, nimi_fi : "kelvoton"},
            		{id : 2, nimi_fi : "+"},
            		{id : 3, nimi_fi : "++"},
            		{id : 4, nimi_fi : "+++"}
        		];

                /*
                 * Painoyksikkö valintalista
                 */
                vm.painoyksikot = [
            		{id : "1", nimi_fi : "g"},
            		{id : "2", nimi_fi : "kg"}
                ];

                /*
                 * Oletusyksiköksi g konservoinnin ennen ja jälkeen kentissä
                 */
                if(!vm.nayte.properties.paino_ennen_yksikko){
                	vm.nayte.properties.paino_ennen_yksikko = 'g';
                }
                if(!vm.nayte.properties.paino_jalkeen_yksikko){
                	vm.nayte.properties.paino_jalkeen_yksikko = 'g';
                }

                /*
                 * Katselutilan kenttien näkyvyys
                 */
                vm.naytaKeskipisteKoordinaatit = function (){
                	// Jos kaikki tyhjiä, ei näytetä lainkaan
                	if(!vm.nayte.properties.koordinaatti_n && !vm.nayte.properties.koordinaatti_e && !vm.nayte.properties.koordinaatti_z){
                		return false;
                	}else{
                		return true;
                	}
                };

                /*
                 * Katselutilan kenttien näkyvyys
                 */
                vm.naytaMinMaxKoordinaatit = function (){
                	// Jos kaikki tyhjiä, ei näytetä lainkaan
                	if(!vm.nayte.properties.koordinaatti_n_min &&
                			!vm.nayte.properties.koordinaatti_n_max &&
                			!vm.nayte.properties.koordinaatti_e_min &&
                			!vm.nayte.properties.koordinaatti_e_max &&
                			!vm.nayte.properties.koordinaatti_z_min &&
                			!vm.nayte.properties.koordinaatti_z_max){
                		return false;
                	}else{
                		return true;
                	}
                };

                /*
                 * Jos keskipiste koordinaatteja annettu disabloidaan min/max koordinaatit
                 */
                vm.keskipisteAnnettu = false;
                vm.validoiKeskipisteKoordinaatit = function (){
                	if(!vm.naytaKeskipisteKoordinaatit()){
                		vm.keskipisteAnnettu = false;
                	}
                	if(vm.nayte.properties.koordinaatti_n || vm.nayte.properties.koordinaatti_e || vm.nayte.properties.koordinaatti_z){
                		vm.keskipisteAnnettu = true;
                	}
                };

                /*
                 * Jos keskipiste koordinaatteja annettu disabloidaan min/max koordinaatit.
                 * Min ja max arvot pareittain eivät voi olla samoja.
                 */
                vm.minMaxAnnettu = false;
                vm.minMaxNSamat = false;
                vm.minMaxESamat = false;
                vm.minMaxZSamat = false;
                vm.validoiMinMaxKoordinaatit = function (form){
                	if(!vm.naytaMinMaxKoordinaatit()){
                		vm.minMaxAnnettu = false;
                	}
                	if(vm.nayte.properties.koordinaatti_n_min ||
                			vm.nayte.properties.koordinaatti_n_max ||
                			vm.nayte.properties.koordinaatti_e_min ||
                			vm.nayte.properties.koordinaatti_e_max ||
                			vm.nayte.properties.koordinaatti_z_min ||
                			vm.nayte.properties.koordinaatti_z_max){
                		vm.minMaxAnnettu = true;
                	}
                	if(vm.nayte.properties.koordinaatti_n_min && vm.nayte.properties.koordinaatti_n_max &&
                			vm.nayte.properties.koordinaatti_n_min === vm.nayte.properties.koordinaatti_n_max){
                		vm.minMaxNSamat = true;
                	}else{
                		vm.minMaxNSamat = false;
                	}
                	if(vm.nayte.properties.koordinaatti_e_min && vm.nayte.properties.koordinaatti_e_max &&
                			vm.nayte.properties.koordinaatti_e_min === vm.nayte.properties.koordinaatti_e_max){
                		vm.minMaxESamat = true;
                	}else{
                		vm.minMaxESamat = false;
                	}
                	if(vm.nayte.properties.koordinaatti_z_min && vm.nayte.properties.koordinaatti_z_max &&
                			vm.nayte.properties.koordinaatti_z_min === vm.nayte.properties.koordinaatti_z_max){
                		vm.minMaxZSamat = true;
                	}else{
                		vm.minMaxZSamat = false;
                	}

                	// Estä tallennus
                	if(vm.minMaxNSamat || vm.minMaxESamat || vm.minMaxZSamat){
                		vm.disableButtons = true;
                	}else{
                		vm.disableButtons = false;
                	}
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

				vm.printQRCode= function() {
					sessionStorage.setItem("tunniste", vm.nayte.properties.luettelointinumero);
					window.open("pages/templates/qrcode_printpage.html", "_blank");
				};

                /*
                 * Avaa konservointitiedot
                 */
                vm.avaaKonservointi = function (){
                	ModalService.konservointiModal(null, vm.nayte, vm.tutkimus);
                };

                /*
                 * Add image to the alue
                 */
                vm.addImage = function(luetteloi) {
                    ModalService.arkImageUploadModal('nayte', vm.nayte, luetteloi, vm.tutkimus.id);
                };

                /*
                 * Open the selected image for viewing
                 */
                vm.openImage = function(image, kuvat) {
                    ModalService.arkImageModal(image, 'nayte', vm.nayte, vm.permissions, kuvat, vm.tutkimus.id);
                };

                /*
                 * Images were modified, fetch them again
                 */
                $scope.$on('arkKuva_modified', function(event, data) {
                	vm.getImages();
                	vm.tunnistekuva = null;
                	vm.getOtherImages();
                });

                /*
                 * Add kartta
                 */
                vm.addKartta = function() {
                    ModalService.arkKarttaUploadModal('nayte', vm.nayte, vm.tutkimus.id);
                };

                /*
                 * Kartat
                 */
                vm.kartat = [];
                vm.getKartat = function() {
                    if (vm.nayte.properties.id && vm.tutkimus.id) {
                        KarttaService.getArkKartat({
                            'jarjestys' : 'ark_kartta.karttanumero',
                            'jarjestys_suunta' : 'nouseva',
                            'rivit' : 1000,
                            'ark_nayte_id' : vm.nayte.properties.id,
                            'ark_tutkimus_id' : vm.tutkimus.id
                        }).then(function success(kartat) {
                            vm.kartat = kartat.features;
                            // Karttojen lkm
                            vm.kartat_maara = vm.kartat.length;
                        }, function error(data) {
                            locale.ready('error').then(function() {
                                AlertService.showError(locale.getString("error.Getting_maps_failed"), AlertService.message(data));
                            });
                        });
                    }
                };
                vm.getKartat();

                /*
                 * Open the selected kartta for viewing
                 */
                vm.openKartta = function(kartta) {
                   ModalService.arkKarttaModal(kartta, 'nayte', vm.nayte, vm.permissions, vm.kartat, vm.tutkimus.id);
                };

                /*
                 * Kartta were modified, fetch them again
                 */
                $scope.$on('arkKartta_modified', function(event, data) {
                	vm.getKartat();
                });

                /*
                 * Luetteloimattomat eli muut kuvat
                 */
                vm.otherImages = [];
                vm.getOtherImages = function() {
                    if (vm.tutkimus.id && vm.nayte.properties.id) {
                        FileService.getArkImages({
                            'jarjestys' : 'ark_kuva.id',
                            'jarjestys_suunta' : 'nouseva',
                            'rivit' : 1000,
                            'ark_tutkimus_id' : vm.tutkimus.id,
                            'ark_tutkimusalue_id' : null,
                            'ark_nayte_id' : vm.nayte.properties.id,
                            'luetteloitu': false
                        }).then(function success(images) {
                            vm.otherImages = images.features;
                            // Muiden kuvien määrä
                            vm.muut_kuvat_kpl_maara = vm.otherImages.length;
                            //Asetetaan tunnistekuva
                            for(var i = 0; i<vm.otherImages.length; i++) {
                            	if(vm.otherImages[i].properties.tunnistekuva === true) {
                            		vm.tunnistekuva = vm.otherImages[i];
                            	}
                            }
                        }, function error(data) {
                            locale.ready('error').then(function() {
                                AlertService.showError(locale.getString("error.Getting_images_failed"), AlertService.message(data));
                            });
                        });
                    }
                };
               	vm.getOtherImages();

                /*
                 * Rontgenkuvat
                 */
                vm.rontgenkuvat = [];
                vm.getRontgenkuvat = function() {
                    if (vm.nayte.properties.id) {
                        RontgenkuvaService.haeRontgenkuvat({
                            'rivit' : 1000,
                            'ark_nayte_id' : vm.nayte.properties.id
                        }).then(function success(r) {
                            vm.rontgenkuvat = r.features;
                        }, function error(data) {
                            locale.ready('error').then(function() {
                                AlertService.showError(locale.getString("error.Getting_images_failed"), AlertService.message(data));
                            });
                        });
                    }
                };
                vm.getRontgenkuvat();

                /*
                 * Open the selected image for viewing
                 */
                vm.avaaRontgenkuva = function(x) {
                	if(x) {
						RontgenkuvaService.haeRontgenkuva(x.properties.id).then(function(xray) {
							ModalService.rontgenModal(true, xray, vm.tutkimus.id, 'nayte', vm.nayte);
						});
                	} else {
						ModalService.rontgenModal(false, null, vm.tutkimus.id, 'nayte', vm.nayte);
					}
                };

                /*
                 * Images were modified, fetch them again
                 */
                $scope.$on('arkXray_modified', function(event, data) {
                	vm.getRontgenkuvat();
                });

                //Jos ark_tutkimusalue_id ei ole asetettu(tai vaikka onkin asetettu), eikä myöskään ark_tutkimusalue_yksikko_id ei ole --> irtolöytö.
                //Tarvitaan tutkimusalueiden valitsin jotta voidaan valita tutkimusalue tämmöisissä tilanteissa
                vm.tutkimusalueet = [];
                vm.getTutkimusalueet = function() {
            		var tId = "";
            		if(vm.nayte.properties.tutkimus) {
            			tId = vm.nayte.properties.tutkimus.id;
            		} else if(vm.nayte.properties.tutkimusalue) {
            			tId = vm.nayte.properties.tutkimusalue.ark_tutkimus_id;
            		} else {
            			return; //Ei case irtolöytö. ei tarvita tutkimusalueita
            		}
                	TutkimusalueService.getTutkimusalueet({'ark_tutkimus_id': tId}).then(function success(data) {
                		//Remove properties
                		vm.tutkimusalueet = [];
                		for(var i = 0; i<data.features.length; i++) {
                			vm.tutkimusalueet.push(data.features[i].properties);
                		}
                	}, function error(data) {
                		AlertService.showError(locale.getString('common.Error'), data.message);
                	});
                };
                vm.getTutkimusalueet();

				hotkeys.bindTo($scope).add({
					combo : 'ä',
					description : 'vm.features',
					callback : function () {
						console.log(angular.copy(vm.nayte.properties));
					}
				});

				/*
                 * Liitetiedostot
                 */
                vm.lisaaTiedosto = function() {
			        //Avataan arkfileUploadController
			        ModalService.arkFileUploadModal('nayte', vm.nayte, vm.tutkimus.id);
                }

                vm.files = [];
                vm.getFiles = function() {
                    if (vm.nayte.properties.id > 0) {
                        FileService.getArkFiles({
                            'jarjestys_suunta' : 'nouseva',
                            'rivit' : 1000,
                            'ark_nayte_id' : vm.nayte.properties.id,
                            'ark_tutkimus_id': vm.tutkimus.id
                        }).then(function success(files) {
                            vm.files = files.features;
                            // Tiedostojen määrä
                            vm.kpl_maara = vm.files.length;
                        }, function error(data) {
                            locale.ready('error').then(function() {
                                AlertService.showError(locale.getString("error.Getting_maps_failed"), AlertService.message(data));
                            });
                        });
                    }
                };
                vm.getFiles();

                /*
                 * Open the selected file for viewing
                 */
                vm.openFile = function(file) {
                    ModalService.arkFileModal(file, 'nayte', vm.nayte, vm.permissions, vm.tutkimus.id);
                };

                /*
                 * files were modified, fetch them again
                 */
                $scope.$on('arkFile_modified', function(event, data) {
                	vm.getFiles();
				});

				/*
                * Update näyte, if ID matches
                */
				$scope.$on('Nayte_update', function(event, data) {
					if (data.nayte.properties.id == vm.nayte.properties.id) {
						vm.nayte = data.nayte;
					}
				});

        // Event for successful QR code reading
        $scope.onSuccess = function (data) {
          $scope.scannerText = data;
          this.$hide();
          $scope.asetaSijainti(data);
        };

        // Event for video error (no permission for camera etc.)
        $scope.onVideoError = function (error) {
          console.log(error);
          vm.showStatus(error);
        };

        vm.showStatus = function (text) {
          $scope.scannerErrorText = text;
        };

        $scope.asetaSijainti = function(data) {
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
          var sailytysTilaHakusana = sailytyspaikka + ', ' + sailytystila;

          // Hae sailytystilat
          ListService.getOptions('ark_sailytystila').then(function success(options) {
            for (var i = 0; i < options.length; i++) {
              if (options[i].nimi_fi == sailytysTilaHakusana) {
                // Asetetaan tilaksi se jonka nimi mätsää sailytyspaikka+sailytystila arvoon
                vm.nayte.properties.sailytystila = options[i];
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
          // Asetetaan hyllypaikka
          vm.nayte.properties.vakituinen_hyllypaikka = hyllypaikka;
        };
		}
]);
