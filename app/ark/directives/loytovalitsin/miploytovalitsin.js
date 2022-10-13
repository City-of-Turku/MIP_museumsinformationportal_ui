angular.module('mip.directives').directive('mipLoytoValitsin', [
        'locale', 'LoytoService', 'AlertService', '$rootScope', function(locale, LoytoService, AlertService, $rootScope) {
            /**
             * Direktiivi jolla voi valita yksiköitä ja löytöjä
             */
            function link(scope, elem, attrs) {
            	if(scope.valitutLoydot === undefined || scope.valitutLoydot === null) {
            		scope.valitutLoydot = [];
            	}

            	//Onko vähintään 1 linkkaus pakollinen
            	if(scope.req === undefined) {
            		scope.req = true;
            	}

            	//Mihin muihin entiteetteihin ko. itemi on linkattu (yksiköt, löydöt)
            	scope.linkedNayteCount = 0;
            	scope.linkedYksikkoCount = 0;

            	$rootScope.$on('mip-linkitys', function (event, data) {
            		//Tämä entiteetti kyseessä
            		if(data.entityId && data.entityId === scope.entityId && data.mode === scope.mode) {
            			scope.linkedNayteCount = data.nayteCount;
            			scope.linkedYksikkoCount = data.yksikkoCount;
            		}
            	});

                scope.loytoHaku = function(lhaku){

                	scope.lhakutulos = [];
                	var tmp = [];

                	// Röntgenkuville voidaan hakea löytöjä myös eri tutkimuksilta eli haetaan ilman tutkimusId:tä.
                	if(scope.mode === 'xray'){
                        LoytoService.haeLoydot({'luettelointinumero': lhaku, 'loydon_tilat_kaikki': true}).then(function (result) {

                       	 tmp = result.features.filter(function(i) {
                       		 return scope.valitutLoydot.map(function(e) {
                       			 return e.id;
                       		 }).indexOf(i.properties.id) < 0;
                       	 });

                       	 for (var i = 0; i<tmp.length; i++) {
                       		 scope.lhakutulos.push(tmp[i].properties);
                       	 }
                        });
                	}else{
                        LoytoService.haeLoydot({'luettelointinumero': lhaku, 'ark_tutkimus_id': scope.tutkimusId}).then(function (result) {

                       	 tmp = result.features.filter(function(i) {
                       		 return scope.valitutLoydot.map(function(e) {
                       			 return e.id;
                       		 }).indexOf(i.properties.id) < 0;
                       	 });

                       	 for (var i = 0; i<tmp.length; i++) {
                       		 scope.lhakutulos.push(tmp[i].properties);
                       	 }
                        });
                	}
                 };

                 scope.addItemBackToList = function(item, model) {
                     for (var i = 0; i < model.length; i++) {
                         if (model[i].id == item.id) {
                             return;
                         }
                     }
                     model.push(item);
                 };

                 scope.addLoyto = function(loyto) {
                	 scope.valitutLoydot.push(loyto);
                	 $rootScope.$broadcast('mip-linkitys', {
                		 mode : scope.mode,
            			 entityId : scope.entityId,
            			 nayteCount : scope.linkedNayteCount,
            			 yksikkoCount : scope.linkedYksikkoCount,
            			 loytoCount : scope.valitutLoydot.length
            		 });
                 };

                 //Huom: ui-selectin bugin takia listalta poistetaan elementti ennen kuin poiston tekevä
             	 //metodi suoritetaan https://github.com/angular-ui/ui-select/issues/463
                 //ui-selectin model on valitutLoydot, mutta silti se palauttaa erillisen modellin jota on muokattu.
                 //jos ollaan poistamassa viimeistä linkatttua elementtiä, palautetaan viimeisin poistettu elementti
                 //ja näytetään ilmoitus että vimoista linkkausta ei voida poistaa.
                 //Samalla ylläpidetään scopen modelia jossa elementit on (valitutLoydot)
                 scope.deleteLoyto = function(itemToDelete, list) {
                	 if(list.length === 0 && scope.linkedYksikkoCount === 0 && scope.linkedNayteCount === 0 && scope.req === true) {
                		 list.push(itemToDelete);
                		 AlertService.showWarning(locale.getString('common.Cannot_remove_last_linked_item'));
                	 } else {
                		 scope.valitutLoydot = list;
                		 $rootScope.$broadcast('mip-linkitys', {
                			 mode : scope.mode,
                			 entityId : scope.entityId,
                			 nayteCount : scope.linkedNayteCount,
                			 yksikkoCount : scope.linkedYksikkoCount,
                			 loytoCount : scope.valitutLoydot.length
                		 });
                	 }
                 };
            }
            return {
                restrict : 'E',
                link : link,
                scope : {
                    valitutLoydot: '=',
                    entityId: '=',
                    tutkimusId: '=',
                    mode : '=',
                    dis : '=',
                    req : '=?'
                },
                transclude: true,
                templateUrl : 'ark/directives/loytovalitsin/miploytovalitsin.html'
            };
        }
]);