/*
 * Konservoinnin UI controller
 */
angular.module('mip.konservointi').controller(
	'KonservointiController',
	[
		'$scope', '$rootScope', 'TabService', '$location', '$filter',
		'CONFIG', 'AlertService', 'ModalService', 'ListService', 'locale', 'permissions',
		'olData', 'hotkeys', '$timeout', 'UserService', 'NgTableParams', 'ToimenpideService', '$popover',
		'selectedModalNameId', 'ModalControllerService', 'loyto', 'nayte', 'tutkimus', 'TutkimusService',
		'EntityBrowserService', 'KonservointiHallintaService', 'LoytoService', 'NayteService', 'FileService', 'RontgenkuvaService',
		function ($scope, $rootScope, TabService, $location, $filter,
			CONFIG, AlertService, ModalService, ListService, locale, permissions,
			olData, hotkeys, $timeout, UserService, NgTableParams, ToimenpideService, $popover,
			selectedModalNameId, ModalControllerService, loyto, nayte, tutkimus, TutkimusService,
			EntityBrowserService, KonservointiHallintaService, LoytoService, NayteService, FileService, RontgenkuvaService) {

			var vm = this;

			/**
			 * Controllerin set-up.
			 */
			vm.setUp = function () {

				angular.extend(vm, ModalControllerService);

				// Valitun modalin nimi ja järjestysnumero
				vm.modalNameId = selectedModalNameId;
				vm.setModalId();
				vm.entity = 'konservointi';

				// Oikeudet
				vm.permissions = permissions;

				// Tutkimus välitetään aina
				vm.tutkimus = tutkimus;

				// Tänne tulee aina joko löytö tai näyte, toinen on null
				vm.loyto = loyto;
				vm.nayte = nayte;

			};
			vm.setUp();


			/**
			 * Sulkemisruksi.
			 */
			$scope.close = function () {
				vm.close();
				$scope.$destroy();
			};

			/**
			 * Peruuta muokkaus.
			 */
			vm.peruutaMuokkaus = function () {
				vm.edit = false;
				vm.create = false;
				if (vm.loyto) {
					vm.loyto = angular.copy(vm.original);

					// unchanged Löytö is broadcasted to controller
					$rootScope.$broadcast('Loyto_update', {
						'loyto': vm.loyto
					});
				}
				if (vm.nayte) {
					vm.nayte = angular.copy(vm.original);

					// unchanged Näyte is broadcasted to controller
					$rootScope.$broadcast('Nayte_update', {
						'nayte': vm.nayte
					});
				}

			};

			/**
			 * Muokkaa konservointia
			 */
			vm._editMode = function () {

				if (vm.loyto) {
					vm.original = angular.copy(vm.loyto);
				}
				if (vm.nayte) {
					vm.original = angular.copy(vm.nayte);
				}

				vm.edit = true;
			};

			/**
			 * Avaa toimenpiteen lisäämisen. Välitetään löydön tai näytteen id
			 */
			vm.lisaaToimenpide = function () {
				var kayttaja = UserService.getProperties();
				var loyto_id = null;
				var nayte_id = null;

				if (vm.loyto) {
					loyto_id = vm.loyto.properties.id;
				} else {
					nayte_id = vm.nayte.properties.id;
				}

				vm.toimenpide = {
					'properties': {
						'ark_loyto_id': loyto_id,
						'ark_nayte_id': nayte_id,
						'ark_kons_toimenpide_id': null,
						'ark_kons_menetelma_id': null,
						'ark_kons_kasittely_id': null,
						'toimenpide': {},
						'menetelma': {},
						'alkaa': new Date(),
						'tekija': kayttaja.user
					}
				};

				ModalService.toimenpideModal(vm.toimenpide, true);
			};

			/**
			 * Toimenpiteet taulu
			 */
			vm.toimenpiteetTable = new NgTableParams({
				page: 1,
				count: 25
			}, {
				getData: function ($defer, params) {

					filterParameters = ListService.parseParameters(params);

					// Lisätään löydön tai näytteen id hakuun
					if (vm.loyto) {
						filterParameters['loyto_id'] = vm.loyto.properties.id;
					} else if (vm.nayte) {
						filterParameters['nayte_id'] = vm.nayte.properties.id;
					}

					vm.toimenpiteetPromise = ToimenpideService.haeToimenpiteet(filterParameters);
					vm.toimenpiteetPromise.then(function (data) {

						if (data.count) {
							vm.toimenpiteita = data.count;
						} else {
							vm.toimenpiteita = 0;
						}

						params.total(data.total_count);
						$defer.resolve(data.features);

					}, function (data) {
						locale.ready('common').then(function () {
							AlertService.showWarning(locale.getString('common.Error'), AlertService.message(data));
						});
						$defer.resolve([]);
					});
				}
			});

			/*
			 * Avaa toimenpide katselutilaan
			 */
			vm.avaaToimenpide = function (valittu_toimenpide) {
				ToimenpideService.haeToimenpide(valittu_toimenpide.properties.id).then(function (toimenpide) {

					ModalService.toimenpideModal(toimenpide, false);

				});
			};

			/*
			 * Päivitetään taulukko, jos tiedot päivittyneet
			 */
			$scope.$on('Update_data', function (event, data) {
				if (data.type == 'toimenpide') {
					vm.toimenpiteetTable.reload();
				}
			});

			/**
			 * Tallenna konservointitiedot, joko löydön tai näytteen
			 */
			vm.save = function () {
				if ($scope.form.$invalid) {
					return;
				}
				vm.disableButtons = true;

				// Valintalistojen tarkistus
				vm.valintalista_reset();

				if (vm.loyto) {
					LoytoService.luoTallennaLoyto(vm.loyto).then(function (loyto) {
						// Päivitetty löytö
						vm.loyto = loyto;
						// "update" the original after successful save
						vm.original = angular.copy(vm.loyto);

						AlertService.showInfo(locale.getString('common.Save_ok'), "");

						vm.disableButtonsFunc();

						// Katselutila päälle
						vm.edit = false;

						// broadcasts updated Löytö to controller
						$rootScope.$broadcast('Loyto_update', {
							'loyto': vm.loyto
						});

					}, function error() {
						AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
						vm.disableButtonsFunc();
					});
				}

				if (vm.nayte) {
					NayteService.luoTallennaNayte(vm.nayte).then(function (nayte) {
						// Päivitetty näyte
						vm.nayte = nayte;
						// "update" the original after successful save
						vm.original = angular.copy(vm.nayte);

						AlertService.showInfo(locale.getString('common.Save_ok'), "");

						vm.disableButtons = false;

						// Katselutila päälle
						vm.edit = false;
						vm.create = false;

						// broadcasts updated Näyte to controller
						$rootScope.$broadcast('Nayte_update', {
							'nayte': vm.nayte
						});

					}, function error() {
						AlertService.showError(locale.getString('common.Error'), locale.getString('common.Save_failed'));
						vm.disableButtons = false;
					});
				}

			};

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

			/**
			 * Valintalistojen arvoja ei tallenneta jos, niihin liittyvien kenttien arvoja ei ole annettu
			 */
			vm.valintalista_reset = function () {
				if (vm.loyto) {
					if (!vm.loyto.properties.paino_ennen) {
						vm.loyto.properties.paino_ennen_yksikko = null;
					}
					if (!vm.loyto.properties.paino_jalkeen) {
						vm.loyto.properties.paino_jalkeen_yksikko = null;
					}
				}
				if (vm.nayte) {
					if (!vm.nayte.properties.paino_ennen) {
						vm.nayte.properties.paino_ennen_yksikko = null;
					}
					if (!vm.nayte.properties.paino_jalkeen) {
						vm.nayte.properties.paino_jalkeen_yksikko = null;
					}
				}
			};

			/**
			 * Avaa linkistä valitun tutkimuksen omaan ikkunaan
			 */
			vm.avaaTutkimus = function (tutkimus_id) {
				TutkimusService.haeTutkimus(tutkimus_id).then(function (tutkimus) {
					EntityBrowserService.setQuery('tutkimus', tutkimus.properties.id, { 'tutkimus_id': tutkimus.properties.id }, 1);
					ModalService.tutkimusModal(true, tutkimus, null);
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

			/*
			 * Käyttäjien haku
			 */
			vm.kayttajat = [];
			vm.getUsers = function () {
				UserService.getUsers({
					'rivit': 10000,
					'aktiivinen': 'true'
				}).then(function success(data) {
					if (vm.kayttajat) {
						vm.kayttajat = [{ 'id': null, 'etunimi': ' Valitse' }];
					}

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

			//Luetteloimattomat kuvat (toistaiseksi vain löydölle tehty)
			vm.otherImages = [];
			vm.getOtherImages = function () {
				if (vm.loyto) {
					FileService.getArkImages({
						'jarjestys': 'ark_kuva.id',
						'jarjestys_suunta': 'nouseva',
						'rivit': 1000,
						'ark_loyto_id': vm.loyto.properties.id,
						'ark_tutkimus_id': vm.tutkimus.id,
						'ark_tutkimusalue_id': null,
						'luetteloitu': false,
						'loyto': false
					}).then(function success(images) {
						vm.otherImages = images.features;
						// Muiden kuvien määrä
						vm.muut_kuvat_kpl_maara = vm.otherImages.length;
					}, function error(data) {
						locale.ready('error').then(function () {
							AlertService.showError(locale.getString("error.Getting_images_failed"), AlertService.message(data));
						});
					});
				}
			};
			vm.getOtherImages();

			/*
			 * Add image
			 */
			vm.addImage = function () {
				ModalService.arkImageUploadModal('loyto', vm.loyto, false, vm.tutkimus.id);
			};

			/*
			 * Open the selected image for viewing
			 */
			vm.openImage = function (image, imgList) {
				ModalService.arkImageModal(image, 'loyto', vm.loyto, vm.permissions, imgList, vm.tutkimus.id);
			};

			/*
			 * Images were modified, fetch them again
			 */
			$scope.$on('arkKuva_modified', function (event, data) {
				vm.getOtherImages();
			});

			hotkeys.bindTo($scope).add({
				combo: 'ä',
				description: 'vm.features',
				callback: function () {
					//console.log(angular.copy(vm.toimenpide.properties));
				}
			});

			/*
			 * Rontgenkuvat
			 */
			vm.rontgenkuvat = [];
			vm.getRontgenkuvat = function () {
				var searchObj = { 'rivit': 1000 };
				if (vm.loyto && vm.loyto.properties.id) {
					searchObj['ark_loyto_id'] = vm.loyto.properties.id;
				}
				else if (vm.nayte && vm.nayte.properties.id) {
					searchObj['ark_nayte_id'] = vm.nayte.properties.id;
				}
				RontgenkuvaService.haeRontgenkuvat(searchObj).then(function success(r) {
					vm.rontgenkuvat = r.features;
				}, function error(data) {
					locale.ready('error').then(function () {
						AlertService.showError(locale.getString("error.Getting_images_failed"), AlertService.message(data));
					});
				});
			};
			vm.getRontgenkuvat();

			/*
			 * Open the selected image for viewing
			 */
			vm.avaaRontgenkuva = function (x) {
				if (x) {
					RontgenkuvaService.haeRontgenkuva(x.properties.id).then(function (xray) {
						if (vm.loyto) {
							ModalService.rontgenModal(true, xray, vm.tutkimus.id, 'loyto', vm.loyto);
						}
						else if (vm.nayte) {
							ModalService.rontgenModal(true, xray, vm.tutkimus.id, 'nayte', vm.nayte);
						}
					});
				}
			};

			/*
			 * Images were modified, fetch them again
			 */
			$scope.$on('arkXray_modified', function (event, data) {
				vm.getRontgenkuvat();
			});

			/*
			 * Kunto field is modified - set the date and user automatically
			 */
			vm.setUserAndDate = function () {
				if (vm.loyto) {
					if (!vm.loyto.properties.kunto_paivamaara) {
						vm.loyto.properties.kunto_paivamaara = new Date();
					}
					if (!vm.loyto.properties.tekija) {
						vm.loyto.properties.tekija = UserService.getProperties().user;
					}
				}
				else if (vm.nayte) {
					if (!vm.nayte.properties.kunto_paivamaara) {
						vm.nayte.properties.kunto_paivamaara = new Date();
					}
					if (!vm.nayte.properties.tekija) {
						vm.nayte.properties.tekija = UserService.getProperties().user;
					}
				}
			}

			vm.konservointiraportti = function() {
				ModalService.arkLoytoKonservointiraporttiModal(vm.loyto);
			}

			vm.kuntoraportti = function(kuntoraportti) {
				if(kuntoraportti) {
					ModalService.arkKuntoraporttiModal({properties:kuntoraportti}, vm.loyto.properties, vm.tutkimus);
				} else {
					ModalService.arkKuntoraporttiModal({properties: {}}, vm.loyto.properties, vm.tutkimus);
				}
			}

			/*
			 * Kuntoraportit were modified, fetch them again
			 */
			$scope.$on('Kuntoraportti_update', function (event, data) {
				if(data.loytoId && vm.loyto && vm.loyto.properties.id == data.loytoId) {
					LoytoService.haeKuntoraportit(vm.loyto.properties.id).then(function success(data) {
						vm.loyto.properties.kuntoraportit.length = 0;
						for(var i = 0; i<data.features.length; i++) {
							vm.loyto.properties.kuntoraportit.push(data.features[i].properties);
						}
					}, function error(data) {
						AlertService.showError(locale.getString('common.Error'));
					});
				}
			});

		}
	]);
