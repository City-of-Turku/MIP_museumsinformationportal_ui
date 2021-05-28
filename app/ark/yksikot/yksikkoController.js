/*
 * Yksikkö UI controller
 */
angular.module('mip.yksikko').controller(
		'YksikkoController',
		[
				'$scope', '$rootScope', 'TabService', '$location', '$filter',
				'CONFIG', 'AlertService', 'ModalService', 'ListService', 'locale', 'permissions',
				'olData', 'hotkeys', '$timeout', 'UserService', 'NgTableParams', 'YksikkoService', '$popover',
				 'selectedModalNameId', 'ModalControllerService', 'yksikko', 'tutkimusalue', 'FileService', 'KarttaService',
				function ($scope, $rootScope, TabService, $location, $filter,
				        CONFIG, AlertService, ModalService, ListService, locale, permissions,
				        olData, hotkeys, $timeout, UserService, NgTableParams, YksikkoService, $popover,
				        selectedModalNameId, ModalControllerService, yksikko, tutkimusalue, FileService, KarttaService) {

				    var vm = this;

				    /**
				     * Controllerin set-up.
				     */
				    vm.setUp = function() {

				        angular.extend(vm, ModalControllerService);

	                    // Valitun modalin nimi ja järjestysnumero
	                    vm.modalNameId = selectedModalNameId;
				        vm.setModalId();
				        vm.entity = 'yksikko';


	                    // Valittu yksikkö
	                    if (yksikko) {
	                        vm.yksikko = yksikko;
	                        vm.tutkimusalue = vm.yksikko.properties.tutkimusalue;
							vm.tutkimus = vm.tutkimusalue.tutkimus;
							vm.suhteet = vm.yksikko.properties.stratigrafia;
	                    }
	                    //Tallennetaan alkuperäinen mahdollisen peruuttamisen vuoksi
	                    vm.original = angular.copy(vm.yksikko);

	                    // Tilan päättelyt:
	                    if(vm.yksikko.properties.kaivaus_valmis){
	                    	// Kaivaus valmis
	                    	vm.edit = false;
	                    	vm.showNotes = false;
	                    	vm.create = false;
	                    	$scope.focusInput = false;
	                    	$scope.focusInput2 = false;
	                    }else{
	                    	// Kaivaus kesken
	                    	vm.edit = false;
	                    	vm.showNotes = false;
	                    	vm.create = true;
	                    	$scope.focusInput = false;
	                    	$scope.focusInput2 = true;
						}

	                    // Oikeudet
						vm.permissions = permissions;

						//SVG
						$scope.colour = "white";
						$scope.strokeColour = "black";
						$scope.strokeWidth = "1";
						$scope.size = {"width": 40, "height": 40};
						vm.centerX = 200; vm.centerY = 150;
						vm.xDiff = 80; vm.yDiff = 60;
						vm.lDiff = 10; //Viivan alkupätkä
						vm.equalSignX = 60; vm.equalSignY = 25;
						vm.yPosUp = vm.centerY - vm.yDiff; vm.yPosDown = vm.centerY + vm.yDiff;
						vm.upUnits = [];
						vm.downUnits = [];
						$scope.equalSings = [];
						$scope.lines = [];
						vm.removeMode = false;
						vm.centerUnits = [{"class": "baserect", "text": vm.yksikko.properties.yksikkotunnus, textClass: "baseText",
						"id": vm.yksikko.properties.id, "xPosition":  vm.centerX, "yPosition": vm.centerY, "new": false, "suhde": "C"}];
						$scope.rectangles = vm.centerUnits.concat(vm.upUnits, vm.downUnits);
						$timeout(function () {
							//console.log(vm.yksikko.properties.yksikkotunnus, vm.yksikko.properties.id);
							$scope.lataaStratigrafia();
							vm.setUpZoom();
						}, 1000);
				    };
					vm.setUp();

					vm.setUpZoom = function(){
						vm.ZoomSVG = svgPanZoom('.svgGraph', { //https://github.com/ariutta/svg-pan-zoom
						//	viewportSelector: '.svg-pan-zoom_viewport'
							panEnabled: true,
							controlIconsEnabled: false,
							zoomEnabled: true,
							//dblClickZoomEnabled: true,
							mouseWheelZoomEnabled: true,
							preventMouseEventsDefault: true,
							zoomScaleSensitivity: 0.2,
							minZoom: 0.1,
							maxZoom: 5,
							fit: false,
							contain: false,
							center: true,
							refreshRate: 'auto'
						 /*
						  , beforeZoom: function(){}
						  , onZoom: function(){}
						  , beforePan: function(){}
						  , onPan: function(){}
						  , onUpdatedCTM: function(){}
						  , eventsListenerElement: null*/
						});
					};

					$scope.lataaStratigrafia = function(){
						if (vm.suhteet){
							vm.centerUnits = [{"class": "baserect", "text": vm.yksikko.properties.yksikkotunnus, textClass: "baseText",
							"id": vm.yksikko.properties.id, "xPosition":  vm.centerX, "yPosition": vm.centerY, "new": false, "suhde": "C"}];
							angular.forEach(vm.suhteet, (value, key) => {
								vm.text = "";
								vm.suhde = "";
								vm.yksikkoid = -1;
								if (value.yksikko1 == vm.yksikko.properties.id){
									vm.text = value.yt2;
									vm.yksikkoid = value.yksikko2;
									vm.suhde = value.suhde;
								}
								else {
									vm.text = value.yt1;
									vm.yksikkoid = value.yksikko1;
									if (value.suhde != "C")
										vm.suhde = value.suhde == "U" ? "D": "U";
									else
										vm.suhde = value.suhde;
								}

								if (vm.suhde == "U"){
									//console.log("Up");
									vm.upUnits.push({"class": "normalrect", "text": vm.text, textClass: "linkText",
									"id": vm.yksikkoid, "xPosition":  0, "yPosition": vm.yPosUp, "new": false, "suhde": vm.suhde});
								}
								else if (vm.suhde == "D"){
									//console.log("Down");
									vm.downUnits.push({"class": "normalrect", "text": vm.text, textClass: "linkText",
									"id": vm.yksikkoid, "xPosition":  0, "yPosition": vm.yPosDown, "new": false, "suhde": vm.suhde});
								}
								else if (vm.suhde == "C"){
									//console.log("Center");
									vm.centerUnits.push({"class": "normalrect", "text": vm.text, textClass: "linkText",
									"id": vm.yksikkoid, "xPosition":  0, "yPosition": vm.centerY, "new": false, "suhde": vm.suhde});
								}
							});

							vm.upUnits.sort((a, b) => a.text.localeCompare(b.text));
							vm.downUnits.sort((a, b) => a.text.localeCompare(b.text));
							vm.centerUnits.sort((a, b) => a.text.localeCompare(b.text));

							$scope.rectangles = vm.centerUnits.concat(vm.upUnits, vm.downUnits);
							$scope.equalSings.length = 0;
							$scope.lines.length = 0;
							$scope.refreshUnits();
							$timeout(function () {
								vm.setUpZoom();
							}, 1000);
						}
					};

                    // Roolien alustus
                    vm.omistaja = false;
                    vm.tutkija = false;
                    vm.katselija = false;

                    /**
                     * ModalHeader kutsuu scopesta closea
                     */
                    $scope.close = function() {
                        vm.close();
                        $scope.$destroy();
                    };

					/**
					 * Peruuta muokkaus
					 */
					vm._cancelEdit = function () {
                        vm.edit = false;
						vm.showNotes = false;
						$timeout(function () {
							vm.setUpZoom();
						}, 1000);
					};

					/**
					 * Vain muistiinpanojen katselu
					 */
					vm.viewNotes = function (){
						vm.create = false;
						vm.edit = false;
						vm.showNotes = true;
					};

					/**
					 * Muokkaa yksikköä, yksikön jälkityöt
					 */
					vm._editMode = function () {
						//vm.originalFeatures = angular.copy(vm.features);
						vm.create = false;
						vm.edit = true;
						vm.showNotes = true;
						$scope.focusInput = true;
						$timeout(function () {
							vm.setUpZoom();
						}, 1000);
					};

					/**
					 * Muokkaa muistiinpanoja
					 */
					vm.editNotes = function (){
						vm.create = true;
						vm.edit = false;
						vm.showNotes = false;
						$scope.focusInput2 = true;
					};

					/**
					 * Tallenna yksikkö
					 */
                    vm.save = function () {
                        vm.disableButtonsFunc();

						vm.tallennaStratigrafia();
						if (vm.yksikko.properties.suhteet.length == 0 && vm.yksikko.properties.kaivaus_valmis){
							var conf = confirm(locale.getString('ark.Confirm_closing_without_joined_unit'));
							if (conf == false){
								vm.disableButtonsFunc();
								return;
							}
						}

                        YksikkoService.luoTallennaYksikko(vm.yksikko).then(function (yksikko) {

                        	// Päivitetään tutkimusalue-sivun yksiköt taulukko
                            $rootScope.$broadcast('Paivita_yksikko_table', {
                                'toiminto' : 'tallenna',
                                'ark_tutkimusalue_id': vm.yksikko.properties.ark_tutkimusalue_id,
                                'ark_vanha_tutkimusalue_id': vm.original.properties.ark_tutkimusalue_id
                            });

                        	// Jos muistiinpanot merkitään valmiiksi, suljetaan avoin modaali ja avataan yksikkö katselutilaan
                        	if(vm.yksikko.properties.kaivaus_valmis && vm.create){
                        		AlertService.showInfo(locale.getString('common.Save_ok'), locale.getString('unit.Digging_ready_confirm'));

                        		// Haetaan tallennettu yksikkö, jotta muistiinpanokenttien arvot näkyvät varsinaisissa kentissä
                        		YksikkoService.haeYksikko(vm.yksikko.properties.id).then(function (yksikko){
                        			vm.yksikko = yksikko;
                        		});

                        		vm.close();
                                $scope.$destroy();

                        		ModalService.yksikkoModal(vm.yksikko, vm.tutkimusalue, vm.permissions);
                        	}else{
                        		vm.create = false;
                                vm.edit = false;

                                // Valmiille ei näytetä muistiinpanoja katselutilassa
                                if(vm.yksikko.properties.kaivaus_valmis){
                                	vm.showNotes = false;
                                }else{
                                	vm.showNotes = true;
                                }

                                // Jos valmis muutetaan takaisin keskeneräiseksi, ilmoitus ja suljetaan modaali
                                if(!vm.yksikko.properties.kaivaus_valmis){
                                	AlertService.showInfo(locale.getString('common.Save_ok'), locale.getString('unit.Unit_set_unfinished'));
                                	vm.close();
                                    $scope.$destroy();
                                }else{
                                    // "update" the original after successful save
                                    vm.original = angular.copy(vm.yksikko);

                                    AlertService.showInfo(locale.getString('common.Save_ok'), "");
                                }
                         	}

                        	vm.disableButtonsFunc();

                        }, function error () {
                            AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
                            vm.disableButtonsFunc();
                        });
					};

					vm.tallennaStratigrafia = function(){
						vm.yksikko1 = vm.yksikko.properties.id;
						vm.suhteet = [];
						angular.forEach(vm.upUnits, (value, key) => {
							vm.suhteet.push({
								yksikko1: vm.yksikko1,
								yksikko2: value.id,
								suhde: "U"
							});
						});
						angular.forEach(vm.downUnits, (value, key) => {
							vm.suhteet.push({
								yksikko1: vm.yksikko1,
								yksikko2: value.id,
								suhde: "D"
							});
						});
						angular.forEach(vm.centerUnits, (value, key) => {
							if (value.id != vm.yksikko1){
								vm.suhteet.push({
									yksikko1: vm.yksikko1,
									yksikko2: value.id,
									suhde: "C"
								});
							}
						});

						vm.yksikko.properties.suhteet = vm.suhteet;
					};

                    /**
                     * Löytojen listaussivun avaus. Asetetaan hakuparametrit valmiiksi valinnan mukaan.
                     * Ajoitus ja valittu materiaalikoodi välitetään.
                     * Vaihtoehdot: 'ajoitettu', 'ajoittamaton' tai 'poistettu'.
                     */
                    vm.listaaLoydot = function (materiaalikoodit, ajoitettu){

                    	// Samaa materiaalia voi olla useita, joten otetaan aina ensimmäinen
                    	var materiaali = [];
                    	materiaali.push(materiaalikoodit[0]);

                    	ModalService.yksikonLoydotModal(materiaali, vm.yksikko, tutkimusalue, ajoitettu, vm.permissions);
                    };

                    /**
                     * Näytteiden listaussivun avaus. Asetetaan hakuparametri näytekoodi valmiiksi valinnan mukaan.
                     */
                    vm.listaaNaytteet = function (naytekoodit){

                    	// Näytekoodeja voi olla useita, joten otetaan aina ensimmäinen
                    	var naytekoodi = [];
                    	naytekoodi.push(naytekoodit[0]);

                    	ModalService.yksikonNaytteetModal(naytekoodi, vm.yksikko, tutkimusalue, vm.permissions);
                    };

					/**
					 * Poista yksikkö
					 */
                    vm.poistaYksikko = function() {
                    	// Poisto estetty jos yksiköllä on löytöjä
                        if(vm.yksikko.properties.loydot.length > 0 ||
                        		vm.yksikko.properties.naytteet.length > 0 ||
                        		vm.kartat.length > 0 ||
                        		(vm.images && vm.images.length > 0)){ //TODO: Lisää tarkastukseen liitetiedostot kun toteutettu
                        	AlertService.showError(locale.getString('unit.Delete_failed'), locale.getString('unit.Unit_delete_error'));
                        }else{
	                        var conf = confirm(locale.getString('common.Confirm_delete2', {'item': vm.yksikko.properties.yksikkotunnus}));
	                        if (conf) {
	                            YksikkoService.poistaYksikko(vm.yksikko).then(function() {
	                            	// Päivitetään tutkimusalue-sivun yksiköt taulukko
	                                $rootScope.$broadcast('Paivita_yksikko_table', {
	                                    'toiminto' : 'poista',
	                                    'ark_tutkimusalue_id': vm.yksikko.properties.ark_tutkimusalue_id
	                                });
	                                vm.close();
	                                $scope.$destroy();
	                                locale.ready('common').then(function() {
	                                    AlertService.showInfo(locale.getString('common.Deleted'));
	                                });
	                            }, function error(data) {
	                                locale.ready('area').then(function() {
	                                    AlertService.showError(locale.getString('ark.Research_delete_failed'), AlertService.message(data));
	                                });
	                            });
	                        }
                        }
                    };

                    /*
                     * Add image to the alue
                     */
                    vm.addImage = function(luetteloi) {
                        ModalService.arkImageUploadModal('yksikko', vm.yksikko, luetteloi, vm.tutkimus.id);
                    };

                    /*
                     * Open the selected image for viewing
                     */
                    vm.openImage = function(image, kuvat) {
                        ModalService.arkImageModal(image, 'yksikko', vm.yksikko, vm.permissions, kuvat, vm.tutkimus.id);
                    };

                    /*
                     * Images were modified, fetch them again
                     */
                    $scope.$on('arkKuva_modified', function(event, data) {
                    	vm.getImages();
                    });

                    /*
                     * Add kartta to the alue
                     */
                    vm.addKartta = function() {
                        ModalService.arkKarttaUploadModal('yksikko', vm.yksikko, vm.tutkimus.id);
                    };

                    /*
                     * kartat
                     */
                    vm.kartat = [];
                    vm.getKartat = function() {
                        if (vm.yksikko.properties.id) {
                            KarttaService.getArkKartat({
                                'jarjestys' : 'ark_kartta.karttanumero',
                                'jarjestys_suunta' : 'nouseva',
                                'rivit' : 1000,
                                'ark_yksikko_id' : vm.yksikko.properties.id,
                                'ark_tutkimus_id': vm.tutkimus.id //Käyttäjäoikeuksien tarkastusta varten
                            }).then(function success(kartat) {
                            	if(kartat.features) {
                            		vm.kartat = kartat.features;
                            	}
                            }, function error(data) {
                                locale.ready('error').then(function() {
                                    AlertService.showError(locale.getString("error.Getting_maps_failed"), AlertService.message(data));
                                });
                            });
                        }
                    };
                    vm.getKartat();

                    /*
                     * Open the selected image for viewing
                     */
                    vm.openKartta = function(kartta) {
                        ModalService.arkKarttaModal(kartta, 'yksikko', vm.yksikko, vm.permissions, vm.kartat, vm.tutkimus.id);
                    };

                    /*
                     * Images were modified, fetch them again
                     */
                    $scope.$on('arkKartta_modified', function(event, data) {
                    	vm.getKartat();
                    });

                    /*
                     * Liitetiedostot
                     */
                    vm.lisaaTiedosto = function() {
    			        //Avataan arkfileUploadController
    			        ModalService.arkFileUploadModal('yksikko', vm.yksikko, vm.tutkimus.id);
                    }

                    vm.files = [];
                    vm.getFiles = function() {
                        if (vm.yksikko.properties.id > 0) {
                            FileService.getArkFiles({
                                'jarjestys_suunta' : 'nouseva',
                                'rivit' : 1000,
                                'ark_yksikko_id' : vm.yksikko.properties.id,
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
                        ModalService.arkFileModal(file, 'yksikko', vm.yksikko, vm.permissions, vm.tutkimus.id);
                    };

                    /*
                     * files were modified, fetch them again
                     */
                    $scope.$on('arkFile_modified', function(event, data) {
                    	vm.getFiles();
					});

					$scope.selectNode = function(valittuYksikko){
						if (vm.yksikko.properties.id == valittuYksikko){
							return;
						}
						//valittuYksikko = 3584;
						if (vm.removeMode == false && !vm.edit && !vm.create){
							YksikkoService.haeYksikko(valittuYksikko).then(function(yksikko) {
								if(yksikko.properties.kaivaus_valmis){
									// Avataan tallennettu yksikkö katselutilaan
									ModalService.yksikkoModal(yksikko, vm.tutkimusalue, vm.permissions);
								}else{
									// Avataan kaivaus muistiinpanojen syöttöön
									ModalService.lisaaYksikkoModal(yksikko, vm.tutkimusalue, vm.permissions);
								}

							}, function error (data) {
								AlertService.showError(locale.getString('common.Error'), AlertService.message(data));
							});
						}
						else if (vm.removeMode == true){
							vm.removeMode = false;
							$scope.rectangles = $filter('filter')($scope.rectangles, {id: '!'+valittuYksikko});
							vm.upUnits = $filter('filter')(vm.upUnits, {id: '!'+valittuYksikko});
							vm.downUnits = $filter('filter')(vm.downUnits, {id: '!'+valittuYksikko});
							vm.centerUnits = $filter('filter')(vm.centerUnits, {id: '!'+valittuYksikko});

							$scope.equalSings.length = 0;
							$scope.lines.length = 0;
							$scope.refreshUnits();
						}
					};

					$scope.poistaSuhde = function(){
						vm.removeMode = !vm.removeMode;
					};

					$scope.createNew = function(position){
						vm.unitExists = false;
						angular.forEach($scope.rectangles, (value, key) => {
							if (value.id == $scope.valittuYksikko.id){
								//AlertService.showError(locale.getString('ark.Research_delete_failed'), AlertService.message(data));
								AlertService.showError(locale.getString('unit.Cannot_add_unit'), locale.getString('unit.Unit_already_added'));
								vm.unitExists = true;
								return;
							}
						});
						if (vm.unitExists == true) return;

						vm.dataRow = null;
						if (position == "up")
							vm.dataRow = vm.addNew(vm.upUnits, vm.yPosUp, $scope.valittuYksikko, "U");
						else if (position == "down")
							vm.dataRow = vm.addNew(vm.downUnits, vm.yPosDown, $scope.valittuYksikko, "D");
						else if (position == "center")
							vm.dataRow = vm.addNew(vm.centerUnits, vm.centerY, $scope.valittuYksikko, "C");


						$scope.rectangles.push(vm.dataRow);
						$scope.equalSings.length = 0;
						$scope.lines.length = 0;
						$scope.refreshUnits();
					}

					vm.addNew = function (unitArray, yPosition, yksikko, suhde){
						vm.dataRow = {"class": "normalrect", "text": yksikko.yksikkotunnus,
							"id": yksikko.id, textClass: "linkText",
							"xPosition":  20, "yPosition": yPosition, "new": true, "suhde": suhde};
						unitArray.push(vm.dataRow);
						unitArray.sort((a, b) => a.text.localeCompare(b.text));
						return vm.dataRow;
					}

					$scope.refreshUnits = function(){
						vm.even = vm.upUnits.length % 2 == 0;
						vm.upCenter = Math.floor(vm.upUnits.length / 2);
						angular.forEach(vm.upUnits, (value, key) => {
							if (vm.even == true){
								if (key <= (vm.upCenter - 1))
									value.xPosition = (vm.centerX - ($scope.size.width)) - (vm.xDiff * (vm.upCenter - key - 1));
								else if (key >= vm.upCenter)
									value.xPosition = (vm.centerX+$scope.size.width) + (vm.xDiff * (key - vm.upCenter));
							}
							else{
								if (key < vm.upCenter)
									value.xPosition = vm.centerX - (vm.xDiff * ((vm.upCenter - key)));
								else if (key > vm.upCenter)
									value.xPosition = vm.centerX + (vm.xDiff * (key - vm.upCenter));
								else
									value.xPosition = vm.centerX;
							}

							vm.points = [
								vm.centerX + ($scope.size.width / 2)+"," +vm.centerY,
								vm.centerX + ($scope.size.width / 2)+"," +(vm.centerY - vm.lDiff),
								value.xPosition + ($scope.size.width / 2)+"," +(vm.centerY - vm.lDiff),
								value.xPosition + ($scope.size.width / 2)+"," +(value.yPosition + $scope.size.height),
							];
							$scope.lines.push({points: vm.points.join(" ")});
						});

						vm.even = vm.downUnits.length % 2 == 0;
						vm.downCenter = Math.floor(vm.downUnits.length / 2);
						angular.forEach(vm.downUnits, (value, key) => {
							if (vm.even == true){
								if (key <= (vm.downCenter - 1))
									value.xPosition = (vm.centerX - ($scope.size.width)) - (vm.xDiff * (vm.downCenter - key - 1));
								else if (key >= vm.downCenter)
									value.xPosition = (vm.centerX+$scope.size.width) + (vm.xDiff * (key - vm.downCenter));
							}
							else{
								if (key < vm.downCenter)
									value.xPosition = vm.centerX - (vm.xDiff * ((vm.downCenter - key)));
								else if (key > vm.downCenter)
									value.xPosition = vm.centerX + (vm.xDiff * (key - vm.downCenter));
								else
									value.xPosition = vm.centerX;
							}

							vm.points = [
								vm.centerX + ($scope.size.width / 2)+"," + (vm.centerY +$scope.size.height),
								vm.centerX + ($scope.size.width / 2)+"," +(vm.centerY +$scope.size.height + vm.lDiff),
								value.xPosition + ($scope.size.width / 2)+"," +(vm.centerY +$scope.size.height + vm.lDiff),
								value.xPosition + ($scope.size.width / 2)+"," +(value.yPosition),
							];
							$scope.lines.push({points: vm.points.join(" ")});
						});

						vm.baseUnit = vm.centerUnits.findIndex(unit => unit.class=="baserect");
						angular.forEach(vm.centerUnits, (value, key) => {
							if (key < vm.baseUnit){
								value.xPosition = (vm.centerX - (vm.xDiff * (vm.baseUnit - key)));
							}
							else if (key > vm.baseUnit){
								value.xPosition = (vm.centerX + (vm.xDiff *(key - vm.baseUnit)));
							}
							//if (value.class == "baserect")

							if (key < (vm.centerUnits.length -1)){
								vm.dataRow = {"xPosition":  (value.xPosition +vm.equalSignX), "yPosition": (vm.centerY + vm.equalSignY)};
								$scope.equalSings.push(vm.dataRow);
							}
						});
					}

					$scope.getTutkimuksenYksikot = function (search) {
						var s = {
						  'rivit': 10,
						  'tutkimus_id': vm.tutkimus.id
						};

						if (search) {
						  s['yksikkotunnus'] = search;
						}
						YksikkoService.haeYksikot(s, 'dYksikkoCache').then(function (result) {
							$scope.yhakutulos = [];
							for (var i = 0; i<result.features.length; i++) {
								if (result.features[i].properties.id == vm.yksikko.properties.id){
									continue;
								}
								$scope.yhakutulos.push(result.features[i].properties);
							}
						});
					};

					$scope.valitseYksikko = function(yksikko){
						$scope.valittuYksikko = yksikko;
					};

					hotkeys.bindTo($scope).add({
						combo : 'ä',
						description : 'vm.features',
						callback : function () {
							console.log(angular.copy(vm.map));
						}
					});
				}
		]);
