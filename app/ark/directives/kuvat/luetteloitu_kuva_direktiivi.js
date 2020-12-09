angular.module('mip.directives').directive('mipLuetteloidutKuvat', [
        'locale', 'FileService', '$filter', function(locale, FileService, $filter) {
            /**
             * Luetteloidut kuvat. Välitetyn id:n tyypin mukaan päätellään mitä kuvia haetaan.
             * Luetteloidun kuvan muoto on esim. DT:11:123 eli ensimmäinen kaksoispiste tulee tutkimuksen päänumerosta ja
             * toinen kaksoispiste generoidaan juoksevan numeron muodostuksessa backendissä.
             * Direktiivissä haetaan viimeisimmän kaksoispisteen jälkeinen numero ja asetetaan dynaamiseen
             * jarjestysnro kenttään int tyyppisenä ja filteröidään oikeaan järjestykseen.
             */
            function link(scope, elem, attrs) {

                scope.vm.images = [];

                var tutkimusId = null;
                var loytoId = null;
                var nayteId = null;
                var yksikkoId = null;
                var tutkimusalueId = null;

                // tutkimusId pitää aina löytyä luetteloiduille kuville
                if(scope.vm.tutkimus && scope.vm.tutkimus.properties != undefined){
                	tutkimusId = scope.vm.tutkimus.properties.id;
                } else if(scope.vm.tutkimus && scope.vm.tutkimus.id){
                	tutkimusId = scope.vm.tutkimus.id;
                } else {
                	return;
                }

                // Löydön kuvat
                if(scope.vm.loyto != undefined){
                    if(scope.vm.loyto.properties.id) {
                        loytoId = scope.vm.loyto.properties.id;
                    } else if(scope.vm.loyto.id) {
                        loytoId = scope.vm.loyto.id;
                    }
                }
                // Näytteen kuvat
                else if(scope.vm.nayte != undefined){
                    if(scope.vm.nayte.properties.id) {
                        nayteId = scope.vm.nayte.properties.id;
                    } else if(scope.vm.nayte.id) {
                        nayteId = scope.vm.nayte.id;
                    }
                }
                // Yksikön kuvat
                else if(scope.vm.yksikko != undefined){
                    if(scope.vm.yksikko.properties.id) {
                        yksikkoId = scope.vm.yksikko.properties.id;
                    } else if(scope.vm.yksikko.id) {
                        yksikkoId = scope.vm.yksikko.id;
                    }
                }
                // Tutkimusalueen kuvat
                else if(scope.vm.tutkimusalue != undefined && loytoId == null && nayteId == null && yksikkoId == null){
                    if(scope.vm.tutkimusalue.properties.id == undefined) {
                        tutkimusalueId = null;
                    } else {
                        tutkimusalueId = scope.vm.tutkimusalue.properties.id;
                    }
                }

                scope.vm.getImages = function(){
                    if (tutkimusId != null) {
                        var searchObj = {
                            'jarjestys_suunta' : 'nouseva',
                            'rivit' : 1000,
                            'ark_tutkimus_id' : tutkimusId,
                            'ark_loyto_id' : loytoId,
                            'ark_nayte_id' : nayteId,
                            'ark_yksikko_id' : yksikkoId,
                            'ark_tutkimusalue_id' : tutkimusalueId,
                            'luetteloitu': true
                        };
                        // Jos ollaan tutkimuksen näkymässä, haetaan ainoastan
                        // löytöihin, näytteisiin, tutkimusalueisiin ja yksiköihin liitetyt kuvat (sekä tutkimukseen liitetyt)
                        if(scope.vm.tutkimus_view) {
                            searchObj['tutkimus_view'] = true;
                        }
                        FileService.getArkImages(searchObj).then(function success(images) {
                        	var features = images.features;

                        	for (var i = 0; i < features.length; i++) {
    							var luettelointinro = features[i].properties.luettelointinumero;
    							var pos = luettelointinro.lastIndexOf(':');
    							var nro = luettelointinro.substring(pos + 1);
    							// Lisätään int muodossa
    							features[i].properties.jarjestysnro = parseInt(nro);
    						}

                        	var jarjestetytKuvat  = $filter('orderBy')(features, 'properties.jarjestysnro');

                        	scope.vm.images = jarjestetytKuvat;

                        }, function error(data) {
                            locale.ready('error').then(function() {
                                AlertService.showError(locale.getString("error.Getting_images_failed"), AlertService.message(data));
                            });
                        });
                    }
                };
                scope.vm.getImages();

                /*
                 * ArkImageController hoitaa kuvien päivitykset ja broadcastaa jos esim kuva poistetaan, joten päivitetään tilanne.
                 */
                scope.$on('arkKuva_modified', function(event, data) {
                	scope.vm.getImages();
                });
            }
            return {
                restrict : 'E',
                link : link,
                scope : {
                    vm : '='
                },
                transclude: true,
                templateUrl : 'ark/directives/kuvat/luetteloidut_kuvat.html'
            };
        }
]);