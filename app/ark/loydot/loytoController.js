/*
 * Löytö UI controller
 */
angular.module('mip.loyto').controller(
		'LoytoController',
		[
			'$scope', '$rootScope', 'TabService', '$location', '$filter',
			'CONFIG', 'AlertService', 'ModalService', 'ListService', 'locale', 'permissions',
			'olData', 'hotkeys', '$timeout', 'UserService', 'NgTableParams', 'LoytoService', '$popover',
			'selectedModalNameId', 'ModalControllerService', 'loyto', 'isEdit', 'TutkimusService', 'YksikkoService',
			'EntityBrowserService', 'FileService', 'KarttaService', 'RontgenkuvaService', 'TutkimusalueService',
			function ($scope, $rootScope, TabService, $location, $filter,
			        CONFIG, AlertService, ModalService, ListService, locale, permissions,
			        olData, hotkeys, $timeout, UserService, NgTableParams, LoytoService, $popover,
			        selectedModalNameId, ModalControllerService, loyto, isEdit, TutkimusService, YksikkoService,
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
			        vm.entity = 'loyto';

                    // Valittu loyto
                    if (loyto) {
                        vm.loyto = loyto;
                        if(vm.loyto.properties.materiaalikoodi) {
                        	vm.ensisijaisetMateriaalit = vm.loyto.properties.materiaalikoodi.ensisijaiset_materiaalit;
                        } else {
                        	if(vm.loyto.properties.tutkimusalue.tutkimus.ark_tutkimuslaji_id == 6 || vm.loyto.properties.tutkimusalue.tutkimus.ark_tutkimuslaji_id == 11) {
                        		vm.haeEnsisijaisetMateriaalit(); //Irtolöytö tai tarkastus, haetaan kaikki materiaalit
                        	}
                        }

                        // Asiasanat
                        vm.loyto.properties.asiasanat = [];
                        if(loyto.properties.loydon_asiasanat){
                        	angular.forEach(loyto.properties.loydon_asiasanat, function (value, key) {
                       		   vm.loyto.properties.asiasanat.push(value.asiasana);
                       		});
                        }

                        // Yksikkö, tutkimusalue ja tutkimus asetetaan helpommin käytettäviksi
                        if(vm.loyto.properties.yksikko){
                        	vm.yksikko = vm.loyto.properties.yksikko;

                        	if(vm.loyto.properties.yksikko.tutkimusalue){
                            	vm.tutkimusalue = vm.loyto.properties.yksikko.tutkimusalue;

                            	if(vm.loyto.properties.yksikko.tutkimusalue.tutkimus){
                                	vm.tutkimus = vm.loyto.properties.yksikko.tutkimusalue.tutkimus;
                                }
                            }
                        } else if(vm.loyto.properties.tutkimusalue) { //IRTOLÖYTÖ tai tarkastus
                        	//Yksikköä ei ole, tutkimusalue on ja suoraan löytössä kiinni
                        	vm.tutkimusalue = vm.loyto.properties.tutkimusalue;
                        	vm.tutkimus = vm.tutkimusalue.tutkimus;
                        }

                        //Tallennetaan alkuperäinen mahdollisen peruuttamisen vuoksi
                        vm.original = angular.copy(vm.loyto);
                        vm.edit = isEdit; // Modaalin avauksessa välitetään muokkaus/katselu tila
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

                    //Asetetaan focus kun vaihtuu trueksi
                    if(isEdit) {
                    	$scope.focusInput = true;

                    } else {
                    	$scope.focusInput = false;
                    }
                    //Luettelointinumeron vaihdon fokus
                    $scope.focusInput2 = false;
                    //Lisää uusi löytö samalle yksikölle eri koodilla fokus
                    $scope.focusInput3 = false;

                    var kplArvio = [
                    	{
                    		'value': true,
                    		'label': locale.getString('ark.Estimate')
                    	}, {
                    		'value': false,
                    		'label': locale.getString('ark.Exact')
                    	}
                    ]
                    vm.kplArvio = kplArvio;
			    };
			    /**
                 * Materiaalikoodin mukaisten ensisijaisten haku
                 */
                vm.haeEnsisijaisetMateriaalit = function (materiaalikoodi){
                	if(materiaalikoodi) {
                    LoytoService.haeEnsisijaisetMateriaalit(materiaalikoodi.id).then(function (data) {

                        if(data){
                        	vm.loyto.properties.materiaalikoodi = materiaalikoodi;
                        	vm.ensisijaisetMateriaalit = data.properties.ensisijaiset_materiaalit;
                        }

                      }, function error () {
                          AlertService.showError(locale.getString('common.Error'), locale.getString('ark.Fetching_primary_material_failed'));

                      });
	                } else {
	                	ListService.getOptions('ark_loyto_materiaali').then(function success(options) {
	                		vm.ensisijaisetMateriaalit = options;
	                    }, function error(data) {
	                        locale.ready('error').then(function() {
	                            // TODO
	                            // AlertService.showError(locale.getString("error.Getting_culturohistorical_values_failed"), AlertService.message(data));
	                            console.log(data);
	                        });
	                    });
	                }
                };

			    vm.setUp();

			    /**
			     * Staattisten valintalistojen oletukset. Ajoitus = jaa, Mitta = mm ja Paino = g, vaatii konsevointia = Ei
			     */
			    vm.valintalista_oletukset = function (){

                    if(!vm.loyto.properties.alkuvuosi_ajanlasku){
                    	vm.loyto.properties.alkuvuosi_ajanlasku = 'jaa';
                    }
                    if(!vm.loyto.properties.paatosvuosi_ajanlasku){
                    	vm.loyto.properties.paatosvuosi_ajanlasku = 'jaa';
                    }
                    if(!vm.loyto.properties.paino){
                    	vm.loyto.properties.painoyksikko = 'g';
                    }
                    if(!vm.loyto.properties.pituus){
                    	vm.loyto.properties.pituusyksikko = 'mm';
                    }
                    if(!vm.loyto.properties.leveys){
                    	vm.loyto.properties.leveysyksikko = 'mm';
                    }
                    if(!vm.loyto.properties.korkeus){
                    	vm.loyto.properties.korkeusyksikko = 'mm';
                    }
                    if(!vm.loyto.properties.halkaisija){
                    	vm.loyto.properties.halkaisijayksikko = 'mm';
                    }
                    if(!vm.loyto.properties.paksuus){
                    	vm.loyto.properties.paksuusyksikko = 'mm';
                    }
                    if(!vm.loyto.properties.konservointi){
                    	vm.loyto.properties.konservointi = 1;
                    }
                    if(!vm.loyto.properties.paino_ennen_yksikko){
                    	vm.loyto.properties.paino_ennen_yksikko = 'g';
                    }
                    if(!vm.loyto.properties.paino_jalkeen_yksikko){
                    	vm.loyto.properties.paino_jalkeen_yksikko = 'g';
                    }
			    };

                // Valintalistojen oletukset
                vm.valintalista_oletukset();

                /**
                 * Sulkemisruksi. Varmistetaan ettei ole pakollisia tietoja tallentamatta.
                 */
                $scope.close = function() {
                	if($scope.form.$invalid){
                        var conf = confirm(locale.getString('ark.Mandatory_data_missing_confirmation'));
                        if (conf) {
                        	vm.close();
                            $scope.$destroy();
                        }
                	}else{
                		vm.close();
                        $scope.$destroy();
                	}

                };

				/**
				 * Peruuta muokkaus. Varmista pakollisten syöttö
				 */
				vm._cancelEdit = function () {
					if($scope.form.$invalid){
	                    var conf = confirm(locale.getString('ark.Mandatory_data_missing_confirmation'));
	                    if (conf) {
	                    	vm.edit = false;
	                    	vm.loyto = angular.copy(vm.original);
	                    }
					} else{
						vm.edit = false;
						vm.loyto = angular.copy(vm.original);
                    }

                    if(vm.loyto.properties.materiaalikoodi) {
                        vm.haeEnsisijaisetMateriaalit(vm.loyto.properties.materiaalikoodi);
                    }
 				};

				/**
				 * Muokkaa löytöä
				 */
				vm._editMode = function () {
					vm.original = angular.copy(vm.loyto);
					vm.edit = true;
					vm.valintalista_oletukset();
					vm.tilanmuutos = false; // tilan muutoksen pvm ja kuvaus-kenttä piiloon

					$scope.focusInput=true;
				};

				vm.avaaTilanMuutosKentat = function (){
					// Tehdään ensin kaikista tyhjät, ettei päivitetä arvoja joita ei uissa näy, mutta joissa kuitenkin on arvot
					// Paitsi säilytetään säilytystila, vakituinen hyllypaikka ja tilapäivänen_sijainti aina.
					// vm.loyto.properties.sailytystila = null;
					// vm.loyto.properties.vakituinen_hyllypaikka = null;
					// vm.loyto.properties.tilapainen_sijainti = null;
					vm.loyto.properties.loppupvm = null;
					vm.loyto.properties.lainaaja = null;
					vm.loyto.properties.tilan_kuvaus = null;

					// Tilan muutoksen pvm eli tapahtumapäivä
					// Lainassa tila -> ei defaultata tähän päivään, tyhjätään mitä ikinä kentässä onkaan
					if(vm.loyto.properties.loydon_tila.id == 7) {
						vm.loyto.properties.tapahtumapaiva = null;
					} else {
						vm.loyto.properties.tapahtumapaiva = new Date();
					}

					vm.tilanmuutos = true;
					//Välitetään bäkkärille implisiittisesti tieto
					//tehdystä tilamuutoksesta
					vm.loyto.properties._tilanmuutos = true;
				};

                /*
                 * Löydön tilat ja tapahtumat taulu
                 */
                vm.tapahtumatTable = new NgTableParams({
                	page : 1,
                    count : 15,
                    total : 15}
                	, {
                		getData : function($defer, params) {
                            params.total(vm.loyto.properties.tapahtumat.length);
                            $defer.resolve(vm.loyto.properties.tapahtumat);
                		}
                	});

                vm.aktivoiLisaaPainike = function (){
                	if(vm.yksikko
                			&& vm.yksikko.yksikkotunnus
                			&& vm.loyto.properties.ark_loyto_materiaalikoodi_id
                			&& vm.loyto.properties.ark_loyto_ensisijainen_materiaali_id
                			&& vm.loyto.properties.ark_loyto_tyyppi_id
                			&& vm.loyto.properties.kuvaus
                			&& vm.loyto.properties.kappalemaara
                			&& !vm.edit && vm.permissions.luonti
                			&& !vm.disableButtons){
                		return true;
                	}else{
                		return false;
                	}
                };

				/**
				 * Tallenna löytö
				 */
                vm.save = function () {
                    vm.disableButtonsFunc();

                    if(vm.loyto.properties.materiaalikoodi && vm.loyto.properties.materiaalikoodi.id) {
                        vm.loyto.properties.ark_loyto_materiaalikoodi_id = vm.loyto.properties.materiaalikoodi.id;
                    }
                    if(vm.loyto.properties.ensisijainen_materiaali && vm.loyto.properties.ensisijainen_materiaali.id) {
                        vm.loyto.properties.ark_loyto_ensisijainen_materiaali_id = vm.loyto.properties.ensisijainen_materiaali.id;
                    }

                    // Valintalistojen tarkistus
                    vm.valintalista_reset();

                    if (vm.loyto.properties.laatikko && vm.loyto.properties.laatikko.length > 0){
                        vm.loyto.properties.vakituinen_hyllypaikka += "." + vm.loyto.properties.laatikko;
                    }

                    LoytoService.luoTallennaLoyto(vm.loyto).then(function (loyto) {

                        // "update" the original after successful save
                        vm.original = angular.copy(vm.loyto);

                        // Päivitetty löytö
                        vm.loyto = loyto;

                        AlertService.showInfo(locale.getString('common.Save_ok'), "");

                    	vm.disableButtonsFunc();

                    	// Katselutila päälle
                        vm.edit = false;

                        // Päivitä asiasanat lista tallennuksen jälkeen
                        vm.loyto.properties.asiasanat = [];
                        if(loyto.properties.loydon_asiasanat){
                        	angular.forEach(loyto.properties.loydon_asiasanat, function (value, key) {
                       		   vm.loyto.properties.asiasanat.push(value.asiasana);
                       		});
                        }

                    	// Tapahtuma taulukon päivitys
                    	vm.tapahtumatTable.reload();

                    }, function error () {
                        AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
                        vm.disableButtonsFunc();
                    });
                };

                /**
                 * Uuden löydön lisääminen samalle yksikölle ja materiaalille
                 */
                vm.uusiLoytoYksikolleJaMateriaalille = function(){
                	vm.disableButtons = true;

                	// Kopioidaan tarvittavat tiedot uuteen löytöön. Tila on aina 1 = Luetteloitu
                	vm.uusiLoyto = {
                			'properties' : {
                				'ark_tutkimusalue_yksikko_id': vm.loyto.properties.ark_tutkimusalue_yksikko_id,
                                'yksikkotunnus': vm.loyto.properties.yksikko.yksikkotunnus,
                                'ark_tutkimus_id': vm.loyto.properties.yksikko.tutkimusalue.ark_tutkimus_id,
                				'ark_materiaalikoodi_id': vm.loyto.properties.ark_loyto_materiaalikoodi_id,
                				'materiaalikoodi': vm.loyto.properties.materiaalikoodi,
                				'loydon_tila_id': 1
                			}
                    };
                    // TMK käsittely on erilainen
                    if(vm.loyto.properties.luettelointinumero.indexOf('TMK') > -1) {
                        var palat = vm.loyto.properties.luettelointinumero.split(':');
                        var alkuosa = palat[0] + ":"; // Tämä on aina sama, ESIM: TMK13245
                        var keskiosa = vm.uusiLoyto.properties.materiaalikoodi.koodi+vm.yksikko.yksikon_numero+":";
                        var luettelointinumero = alkuosa + keskiosa;
                    } else {
                        //Normaali muoto - TunnusPaanumero:Juokseva
                        var palat = vm.loyto.properties.luettelointinumero.split(':');
                        var alkuosa = palat[0] + ':'; // Tämä on aina esim KM123
                        var luettelointinumero = alkuosa;
                    }

                	// Luettelointinumeroon lisätään juokseva alanumero backendissä
                	vm.uusiLoyto.properties.luettelointinumero = luettelointinumero;

                	// Tallennetaan uusi
                	vm.tallennaUusiLoyto();
                };

                /**
                 * Uuden löydön lisääminen samalle yksikölle
                 */
                vm.uusiLoytoYksikolle = function (){
                	vm.disableButtons = true;
                	vm.loydonLisays = true;
                	$scope.focusInput3 = true;
                    $scope.focusInput4 = true;
                    // Uudelle löydölle laitetaan yksikön id viittaus
                	vm.uusiLoyto = {
                			'properties' : {
                				'ark_tutkimusalue_yksikko_id': vm.yksikko.id,
                                'yksikkotunnus': vm.yksikko.yksikkotunnus,
                                'ark_tutkimus_id': vm.tutkimus.id,
                				'loydon_tila_id': 1,
                				'ark_materiaalikoodi_id': null,
                				'luettelointinumero': null,
                				'materiaalikoodi': null
                			}
                	};
                };

                /**
                 * Peruutetaan löydön lisäys yksikölle
                 */
                vm.peruutaLoydonLisays = function (){
                	vm.disableButtons = false;
                	vm.loydonLisays = false;
                };

                /**
                 * Tallentaa uuden löydön yksikölle
                 */
                vm.tallennaLoytoYksikolle = function (){

                	// Asetetaan valitun materiaalikoodin id löydölle
                	vm.uusiLoyto.properties.ark_loyto_materiaalikoodi_id = vm.uusiLoyto.properties.materiaalikoodi.id;

                	/*
                	 *  Luettelointinumero voi koostua
                	 *  CASE 1:
                	 *  1. Tutkimuksen tunnuksesta = TMK12345:
                	 *  2. Materiaalikoodi + yksikön numero = KI516:
                	 *  --> Tähän lisätään bäkkärissä juokseva alanumero
                	 *  TAI
                	 *  CASE 2:
                	 *  1. Tutkimuksen tunnuksesta = TMK12345:
                	 *  2. Materiaalikoodi = KI
                	 *  3. Juokseva numero
                	 *  Materiaalikoodin ja juoksevan numeron välissä ei ole erotinmerkkiä
                	 *  ESIMERKKI: TMK12345:KI321
                	 *  TAI
                	 *  CASE 3:
                	 *  1. Tutkimuksen tunnuksesta = TMK12345:
                	 *  2. Materiaalikoodi = KI
                	 *  3. Yksikön numero = 516
                	 *  4. Juokseva numero 1
                	 *  ESIMERKKI: TMK12345:KI516321
                	 *  Materiaalikoodin, yksikön numeron ja juoksevan numeron välissä ei ole erotinmerkkejä
                	 */
                    // TMK käsittely on erilainen
                    if(vm.loyto.properties.luettelointinumero.indexOf('TMK') > -1) {
                	var palat = vm.loyto.properties.luettelointinumero.split(':');
                	var alkuosa = palat[0] + ":"; // Tämä on aina sama, ESIM: TMK13245
                	var keskiosa = vm.uusiLoyto.properties.materiaalikoodi.koodi+vm.yksikko.yksikon_numero+":";

                	var luettelointinumero = alkuosa + keskiosa;
                    } else {
                         //Normaali muoto - TunnusPaanumero:Juokseva
                         var palat = vm.loyto.properties.luettelointinumero.split(':');
                         var alkuosa = palat[0] + ':'; // Tämä on aina esim KM123
                         var luettelointinumero = alkuosa;
                    }


                	// Kopioidaan luettelointinumeron alku ja lisätään siihen valittu materiaalikoodi.
                	//var palat = vm.loyto.properties.luettelointinumero.split(':'[0]);
                	//var alkuosa = palat[0];
                	//var luettelointinumero = alkuosa.concat(':').concat(vm.uusiLoyto.properties.materiaalikoodi.koodi).concat(vm.yksikko.yksikon_numero).concat(':');

                	// Luettelointinumeroon lisätään juokseva alanumero backendissä
                	vm.uusiLoyto.properties.luettelointinumero = luettelointinumero;

                	// Tallennetaan uusi
                	vm.tallennaUusiLoyto();

                	vm.loydonLisays = false;
                };

                /**
                 * Tallentaa uuden löydön ja avaa muokkaustilaan.
                 * Samaa käytetään löydön lisäämisessä yksikölle tai yksikölle ja materiaalille.
                 */
                vm.tallennaUusiLoyto = function(){
                	vm.disableButtons = true;

                	// Luodaan löytö
                    LoytoService.luoTallennaLoyto(vm.uusiLoyto).then(function (loyto) {

                    	AlertService.showInfo(locale.getString('common.Save_ok'), locale.getString('ark.New_discovery_created'));

                        // Aktivoidaan painikkeet
                    	vm.disableButtons = false;

                        EntityBrowserService.setQuery('loyto', loyto.properties.id, {'loyto_id': loyto.properties.id}, 1);
                        // Avataan löytö tietojen syöttöön
                        ModalService.loytoModal(loyto, true);

                    }, function error () {
                        AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
                        vm.disableButtons = false;
                    });
                };

                /**
                 * Luettelointinumeron vaihto.
                 */
                vm.vaihdaLuettelointinumero = function (){
                	vm.disableButtons = true;
                	vm.vaihdaNumero = true;
                	$scope.focusInput2 = true;
                	//Tallennetaan originelli yksikkotunnus mahdollista cancellointia varten
                	if(vm.yksikko){
                		vm.originalYksikko = angular.copy(vm.yksikko);
                	}
                	// Alue talteen myös
                	vm.originalTutkimusalue = angular.copy(vm.tutkimusalue);
                };

                /**
                 * Tarkistaa löytyykö tutkimukselta luettelointinumeron vaidossa annettava yksikkö
                 */
                vm.yksikkoLoytyy = true;
                vm.tarkistaYksikko = function (form){

                	YksikkoService.haeTutkimuksenYksikko(vm.loyto.properties.yksikko.tutkimusalue.ark_tutkimus_id, vm.yksikko.yksikkotunnus).then(function (yksikko){

                		// Asetetaan löydölle valittu yksikkö
                		if(yksikko){
                			vm.yksikko.yksikkotunnus = yksikko.yksikkotunnus;
                			vm.loyto.properties.yksikko = yksikko;
                			vm.loyto.properties.ark_tutkimusalue_yksikko_id = yksikko.id;
							form.yksikkotunnus.$setValidity('yksikkotunnus_ok', true);
							vm.yksikkoLoytyy = true;
                		}else{
                			form.yksikkotunnus.$setValidity('yksikkotunnus_ok', false);
   							vm.yksikkoLoytyy = false;

                		}
                	});
                };

                /**
                 * Tarkistaa löytyykö tutkimukselta luettelointinumeron vaidossa annettava yksikkö
                 */
                vm.tutkimusalueLoytyy = true;
                vm.tarkistaTutkimusalue = function (form){

                	TutkimusalueService.tarkistaTutkimuksenTutkimusalue(vm.tutkimusalue.nimi, vm.tutkimus.id).then(function (tutkimusalue){

                		// Asetetaan löydölle tutkimusalue, jos löytyi
                		if(tutkimusalue){
                			vm.tutkimusalue = tutkimusalue;
                			vm.loyto.properties.ark_tutkimusalue_id = tutkimusalue.id;

							form.tutkimusalue.$setValidity('tutkimusalue_ok', true);
							vm.tutkimusalueLoytyy = true;
                		}else{
                			// Ei löydy, näytä virhe
                			form.tutkimusalue.$setValidity('tutkimusalue_ok', false);
   							vm.tutkimusalueLoytyy = false;
                		}
                	});
                };

                /**
                 * Peruuta vaihtaminen
                 */
                vm.peruutaLuettelointinumeronVaihto = function (){

                	vm.disableButtons = false;
                	vm.vaihdaNumero = false;

                	// Palautetaan alkuperäinen tilanne
                	vm.loyto = angular.copy(vm.original);
                	vm.haeEnsisijaisetMateriaalit(vm.loyto.properties.materiaalikoodi);

                	//Palautetaan yksikkotunnus, jos löytyy (kaivaustutkimuksella on)
                	if(vm.originalYksikko){
                    	vm.yksikko = angular.copy(vm.originalYksikko);
                    	vm.loyto.properties.yksikko = vm.yksikko;
            			vm.loyto.properties.ark_tutkimusalue_yksikko_id = vm.yksikko.id;
                	}
                	// Palautetaan tutkimusalue
                	vm.tutkimusalue = angular.copy(vm.originalTutkimusalue);
                };

                /**
                 * Tallennetaan vaihdettu luettelointinumero.
                 * Kaivaustutkimuksen luettelointinumerosta voidaan vaihtaa yksikkö- ja / tai materiaali sekä ensisijainen materiaali.
                 * Tutkimuksilla joilla ei ole yksikköä voidaan vaihtaan tutkimusalue, materiaali ja ensisijainen materiaali. (esim. irtolöytö ja tarkastus)
                 * Juokseva alanumero generoidaan backendissa aina, jos muutos tehty.
                 */
                vm.tallennaLuettelointinumero = function (){

                	var muutettu = false;

                	// Verrataan onko yksikkö tai materiaali vaihdettu


                	//Sallitaan myös tyhjän arvon päivittäminen uuteen
                	if(!vm.loyto.properties.ark_loyto_materiaalikoodi_id && vm.loyto.properties.materiaalikoodi.id) {
                		muutettu = true;
                	} else if(vm.loyto.properties.ark_loyto_materiaalikoodi_id.toString() != vm.loyto.properties.materiaalikoodi.id.toString()){
                		muutettu = true;
                	}

                	if(vm.yksikko &&  vm.loyto.properties.ark_tutkimusalue_yksikko_id.toString() != vm.original.properties.ark_tutkimusalue_yksikko_id.toString()){
                		muutettu = true;
                	}

                	if(!vm.yksikko &&  vm.loyto.properties.ark_tutkimusalue_id.toString() != vm.original.properties.ark_tutkimusalue_id.toString()){
                		muutettu = true;
                	}

                	// Irtolöytö / Vanha tutkimus: Sallitaan luettelointinumeron vaihtaminen ilman, että tietoja on muutettu
                	// migraatiodatan korjausta varten.
                	// Itse asiassa koko tarkastus haluttaneen pois.
                	/*
                	if(!muutettu && (vm.tutkimus.ark_tutkimuslaji_id !== 6 && vm.tutkimus.ark_tutkimuslaji_id !== "6")) {
                		if(vm.yksikko){
                			AlertService.showError(locale.getString('common.Error'), locale.getString('ark.Unit_materialcode_unchanged'));
                		}else{
                			AlertService.showError(locale.getString('common.Error'), locale.getString('ark.Research_area_materialcode_unchanged'));
                		}
                		return;
                	}

                	*/

                	// Asetetaan valittu materiaalikoodi ja ensisijainen materiaali
                	vm.loyto.properties.ark_loyto_materiaalikoodi_id = vm.loyto.properties.materiaalikoodi.id;
                	vm.loyto.properties.ark_loyto_ensisijainen_materiaali_id = vm.loyto.properties.ensisijainen_materiaali.id;

                    // Valintalistojen tarkistus
                    vm.valintalista_reset();

                	LoytoService.vaihdaLuettelointinumero(vm.loyto).then(function (loyto){

                		// Päivitetään modelin tiedot
                		if(loyto){
                			vm.loyto = loyto;

                			// Kaivaustutkimus
                			if(vm.loyto.properties.yksikko){
                    			vm.yksikko = vm.loyto.properties.yksikko;
                    			//Päivitetään originelli yksikkotunnus
                            	vm.originalYksikko = angular.copy(vm.yksikko);
                    			vm.tutkimusalue = vm.loyto.properties.yksikko.tutkimusalue;
                    			vm.tutkimus = vm.loyto.properties.yksikko.tutkimusalue.tutkimus;
                			}else{
                				// Irtolöytö tai tarkastus
                				vm.tutkimusalue = vm.loyto.properties.tutkimusalue;
                				vm.tutkimus = vm.loyto.properties.tutkimusalue.tutkimus;
                			}

                			vm.original = angular.copy(vm.loyto);
                		}
                    	// Tapahtuma taulukon päivitys
                    	vm.tapahtumatTable.reload();

                    	AlertService.showInfo(locale.getString('common.Save_ok'), locale.getString('ark.List_number_changed'));

                	}, function error (data) {
                        AlertService.showError(locale.getString('common.Error'), data.response.message[0]);
                    });

            		// Takaisin normi katselunäyttöön
                	vm.disableButtons = false;
                	vm.vaihdaNumero = false;
                };

                /**
                 * Asiasanojen haku
                 */
                vm.hakusana = "";
                vm.hakutulos = [];
                vm.hakutuloksia = 0;
                vm.fintoHaku = function(haku){

            		// Haku Finto sanastosta
                    ListService.queryAsiasana(haku).then(function (result) {
                        vm.hakutulos = poistaDuplikaatit(result);
                        vm.hakutuloksia = vm.hakutulos.length;
                    });
                };

                /*
                 * Tuplien poisto asiasanoista
                 */
                function poistaDuplikaatit(asiasanat){
                    var uniikit = Array.from(new Set(asiasanat));
                    return uniikit;
                };

                /*
                 * Asiasanojen monivalinnan täyttö.
                 */
                vm.lisaaAsiasana = function(sana){
                	vm.loyto.properties.asiasanat.push(sana);
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
                 * Avaa linkistä valitun tutkimusalueen omaan ikkunaan.
                 * Haetaan aina ensin tutkimus, jotta on ajan tasalla ja saadaan toivottu rakenne (tutkimus.properties..)
                 */
				vm.avaaTutkimusalue = function() {

					TutkimusService.haeTutkimus(vm.tutkimus.id).then(function(tutkimus) {
						if(tutkimus){
						    TutkimusalueService.fetchTutkimusalue(vm.tutkimusalue.id).then(function(tutkimusalue) {
		                        ModalService.tutkimusalueModal(tutkimusalue, vm.modalId, tutkimus);
		                    }, function (data) {
		                        AlertService.showError(locale.getString('error.Error'), AlertService.message(data));
		                    });
						}
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
                 * Avaa valitun tapahtuman omaan ikkunaan
                 */
                vm.avaaTapahtuma = function (tapahtuma){
                	ModalService.loytoTapahtumaModal(tapahtuma, vm.loyto);
                };

                /**
                 * Valintalistojen arvoja ei tallenneta jos, niihin liittyvien kenttien arvoja ei ole annettu
                 */
                vm.valintalista_reset = function (){
                    if(!vm.loyto.properties.alkuvuosi){
                    	vm.loyto.properties.alkuvuosi_ajanlasku = null;
                    }
                    if(!vm.loyto.properties.paatosvuosi){
                    	vm.loyto.properties.paatosvuosi_ajanlasku = null;
                    }
                    if(!vm.loyto.properties.paino){
                    	vm.loyto.properties.painoyksikko = null;
                    }
                    if(!vm.loyto.properties.pituus){
                    	vm.loyto.properties.pituusyksikko = null;
                    }
                    if(!vm.loyto.properties.leveys){
                    	vm.loyto.properties.leveysyksikko = null;
                    }
                    if(!vm.loyto.properties.korkeus){
                    	vm.loyto.properties.korkeusyksikko = null;
                    }
                    if(!vm.loyto.properties.halkaisija){
                    	vm.loyto.properties.halkaisijayksikko = null;
                    }
                    if(!vm.loyto.properties.paksuus){
                    	vm.loyto.properties.paksuusyksikko = null;
                    }
                };

                /*
                 * Ajanlasku
                 */
                vm.ajanlaskut = [
                	{
                		'value': 'eaa', 'label': 'eaa'
                	},
                	{
                		'value': 'jaa', 'label': 'jaa'
                	}
                ];

                /*
                 * Painoyksikkö valintalista
                 */
                vm.painoyksikot = [
                	{
                		'value': 'g', 'label': 'g'
                	},
                	{
                		'value': 'kg', 'label': 'kg'
                	}
                ];

                /*
                 * Mittayksikkö valintalista
                 */
                vm.pituusyksikot = [
                	{
                		'value': 'mm', 'label': 'mm'
                	},
                	{
                		'value': 'cm', 'label': 'cm'
                	},
                	{
                		'value': 'm', 'label': 'm'
                	}
                ];

                // Vaatii konservointia valintalista
                vm.konservointiLista = [
            		{id : 1, nimi_fi : "Ei"},
            		{id : 2, nimi_fi : "Kyllä"},
            		{id : 3, nimi_fi : "Ehkä"}
        		];

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
					sessionStorage.setItem("tunniste", vm.loyto.properties.luettelointinumero);
					window.open("general/qrcode_printpage.html", "_blank");
				};


                /*
                 * Add image to the alue
                 */
                vm.addImage = function(luetteloi) {
                    ModalService.arkImageUploadModal('loyto', vm.loyto, luetteloi, vm.tutkimus.id, 'loyto');
                };

                //Luetteloimattomat kuvat
                vm.getOtherImages = function() {
                    if (vm.loyto.properties.id) {
                        FileService.getArkImages({
                            'jarjestys' : 'ark_kuva.id',
                            'jarjestys_suunta' : 'nouseva',
                            'rivit' : 1000,
                            'ark_loyto_id' : vm.loyto.properties.id,
                            'ark_tutkimus_id' : vm.tutkimus.id,
                            'ark_tutkimusalue_id' : null,
                            'luetteloitu': false,
                            'loyto': true,
                            'kuvatyyppi': CONFIG.LOYTO_KUVA_TYYPIT['loyto']
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
                 * Open the selected image for viewing
                 */
                vm.openImage = function(image, imgList) {
                    ModalService.arkImageModal(image, 'loyto', vm.loyto, vm.permissions, imgList, vm.tutkimus.id);
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
                 * Avaa konservointitiedot
                 */
                vm.avaaKonservointi = function (){
                	ModalService.konservointiModal(vm.loyto, null, vm.tutkimus);
                };

                /*
                 * Add kartta
                 */
                vm.addKartta = function() {
                    ModalService.arkKarttaUploadModal('loyto', vm.loyto, vm.tutkimus.id);
                };

                /*
                 * Kartat
                 */
                vm.kartat = [];
                vm.getKartat = function() {
                    if (vm.loyto.properties.id) {
                        KarttaService.getArkKartat({
                            'jarjestys' : 'ark_kartta.karttanumero',
                            'jarjestys_suunta' : 'nouseva',
                            'rivit' : 1000,
                            'ark_loyto_id' : vm.loyto.properties.id,
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
                   ModalService.arkKarttaModal(kartta, 'loyto', vm.loyto, vm.permissions, vm.kartat, vm.tutkimus.id);
                };

                /*
                 * Kartta were modified, fetch them again
                 */
                $scope.$on('arkKartta_modified', function(event, data) {
                	vm.getKartat();
                });

                /*
                 * Rontgenkuvat
                 */
                vm.rontgenkuvat = [];
                vm.getRontgenkuvat = function() {
                    if (vm.loyto.properties.id) {
                        RontgenkuvaService.haeRontgenkuvat({
                            'rivit' : 1000,
                            'ark_loyto_id' : vm.loyto.properties.id
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
							ModalService.rontgenModal(true, xray, vm.tutkimus.id, 'loyto', vm.loyto);
						});
                	} else {
						ModalService.rontgenModal(false, null, vm.tutkimus.id, 'loyto', vm.loyto);
					}
                };

                /*
                 * Images were modified, fetch them again
                 */
                $scope.$on('arkXray_modified', function(event, data) {
                	vm.getRontgenkuvat();
                });


                /*
                 * Liitetiedostot
                 */
                vm.lisaaTiedosto = function() {
			        //Avataan arkfileUploadController
			        ModalService.arkFileUploadModal('loyto', vm.loyto, vm.tutkimus.id);
                }

                vm.files = [];
                vm.getFiles = function() {
                    if (vm.loyto.properties.id > 0) {
                        FileService.getArkFiles({
                            'jarjestys_suunta' : 'nouseva',
                            'rivit' : 1000,
                            'ark_loyto_id' : vm.loyto.properties.id,
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
                    ModalService.arkFileModal(file, 'loyto', vm.loyto, vm.permissions, vm.tutkimus.id);
                };

                /*
                 * files were modified, fetch them again
                 */
                $scope.$on('arkFile_modified', function(event, data) {
                	vm.getFiles();
                });

                /*
                * Update löytö, if ID matches
                */
                $scope.$on('Loyto_update', function(event, data) {
                    if (data.loyto.properties.id == vm.loyto.properties.id) {
                        vm.loyto = data.loyto;
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
                  // Asetetaan hyllypaikka
                  vm.loyto.properties.vakituinen_hyllypaikka = hyllypaikka;
                };
		}
]);
