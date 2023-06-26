/*
 * Service for handling the visible tabs and subtabs.
 * NOTE: The tabs and subtabs for ark part of the application are temporarily hidden.
 *       Uncomment the commented rows to show the ark content also.
 */
(function() {
angular.module('mip.menu', []);

angular.module('mip.menu').factory('TabService', [
		'locale', 'UserService',
		function (locale, UserService) {

			var tabFunctions = {
				/*
				 * Return the tabs available for the user
				 */
				getTabs : function () {
    					var building_inventory = locale.getString('common.Building_inventory');
    					var arc = locale.getString('common.Archeology');
    					var map = locale.getString('common.Map');
    					var search = locale.getString('common.Search');
    					var administration = locale.getString('common.Administration');
    					var reports = locale.getString('common.Reports');
    					var imgAndFileSearch = locale.getString('common.Search');

    					/*
    					 * Main tabs.
    					 */
    					/*
    					 * Search is temporarily hidden. When they are implemented / taken into use, uncomment the sections.
    					 */
    					var tabList = [
    						{
    							"title" : building_inventory,
    							"href" : "/"
    						},
    						{
    							"title" : arc,
    							"href" : "/kohteet"
    						},
    						{
    							"title" : map,
    							"href" : "/kartta"
    						},
    						//{ legacy, not in use
    						//	"title" : search,
    						//	"href" : "/haku"
    						//},
    						{
                                "title" : reports,
                                "href" : "/raportit"
                            },
                            {
                            	"title": imgAndFileSearch,
                            	"href": "/ark_kuvat" //Ohjataan ark_tabille oletuksena
                            },
    						{
    							"title" : administration,
    							"href" : "/kayttajat"
    						}

    					];

    					return tabList;
				},
				/*
				 * Main tabs, no admin.
				 * if everyone can see the reports tab, the isTutkija parameter can be removed (also calling from app.js) and just add the tab to the list
				 */
				getTabsNoAdmin : function (showReportTab) {
					var building_inventory = locale.getString('common.Building_inventory');
					var arc = locale.getString('common.Archeology');
					var map = locale.getString('common.Map');
					var search = locale.getString('common.Search');
					var reports = locale.getString('common.Reports');
					var imgAndFileSearch = locale.getString('common.Search');

					/*
					 * Main tabs. No admin.
					 */
					var tabList = [
						{
							"title" : building_inventory,
							"href" : "/"
						},
						{
							"title" : arc,
							"href" : "/kohteet"
						},
						{
							"title" : map,
							"href" : "/kartta"
						},
                        {
                        	"title": imgAndFileSearch,
                        	"href": "/ark_kuvat" //Ohjataan ark kuviin oletuksena
                        }
						//, { legacy, not in use
						//	"title" : search,
						//	"href" : "/haku"
						//}
					];

					if(showReportTab) {
					    tabList.push({
					        "title" : reports,
                            "href" : "/raportit"
					    });
					}

					return tabList;
				},
				/*
				 * Return the sub tabs available for the user
				 */
				getSubTabs : function (showMatkaraportit) {
					var estates = locale.getString('common.Estates');
					var buildings = locale.getString('common.Buildings');
					var staircases = locale.getString('common.Staircases');
					var areas = locale.getString('common.Areas');
					var valueareas = locale.getString('common.Valueareas');
					var counties = locale.getString('common.Counties');
					var architects = locale.getString('common.Architects');
					var villages = locale.getString('common.Villages');
					var inventoryprojects = locale.getString('common.Inventory_projects');
					var matkaraportit = locale.getString('common.Travel_reports');
					var carts = locale.getString('common.Carts');

					/*
					 * Subtabs (the lower tab bar)
					 */
					var subTabList = [
						{
							"title" : estates,
							"href" : "/kiinteistot"
						}, {
							"title" : buildings,
							"href" : "/rakennukset"
						}, {
							"title" : staircases,
							"href" : "/porrashuoneet"
						}, {
							"title" : areas,
							"href" : "/alueet"
						}, {
							"title" : valueareas,
							"href" : "/arvoalueet"
						}, {
							"title" : counties,
							"href" : "/kunnat"
						}, {
							"title" : villages,
							"href" : "/kylat"
						}, {
                            "title" : architects,
                            "href" : "/suunnittelijat"
                        }, {
							"title" : inventoryprojects,
							"href" : "/inventointiprojektit"
						}
					];

					if(showMatkaraportit === true) {
					    subTabList.push({
					        "title": matkaraportit,
                            "href": "/matkaraportit"
					    });
					}
					// korit viimeiseksi
				    subTabList.push({
				        "title": carts,
                        "href": "/rak_korit"
				    });

					return subTabList;
				},
				/*
				 * Admin subtabs
				 */
				getAdminSubTabs : function () {

					var users = locale.getString('common.Users');
					var selectionlists = locale.getString('common.Selection_lists');
					var arkselectionlists = locale.getString('common.Ark_selection_lists');
					var publications = locale.getString('common.Inventory_publications');
					var copyrightClauses = locale.getString('common.Copyright_clauses');
					var adminTools = locale.getString("common.Admin_tools");

					var adminSubTabList = [
						{
							"title" : users,
							"href" : "/kayttajat"
						},
						{
						    "title": publications,
						    "href": "/julkaisut"
						},
						{
							"title": copyrightClauses,
							"href": "/tekijanoikeuslausekkeet"
						},
						{
							"title": adminTools,
							"href": "/tyokalut"
						}
						//{
						//	"title" : selectionlists,
						//	"href" : "/valintalistat"
						//}, {
						//	"title" : arkselectionlists,
						//	"href" : "/arkvalintalistat"
						//}
					];

					return adminSubTabList;
				},
				getReportSubTabs : function() {
				    var reports = locale.getString('common.Reports');

                    /*
                     * Subtabs (the lower tab bar)
                     */
                    var subTabList = [
                        {
                            "title" : reports,
                            "href" : "/raportit"
                        }
                    ];

                    return subTabList;
				},
				getSearchSubTabs : function() {
				    var imgsB = locale.getString('common.Building_inventory_images');
				    var imgsA = locale.getString('common.Archeology_images');
				    var mapsA = locale.getString('ark.Archeology_maps');

                    /*
                     * Subtabs (the lower tab bar)
                     */
                    var subTabList = [
                       // { Laitetaan näkyviin kun rakennuspuolen kuvien haku toteutetaan
                       //     "title" : imgsB,
                       //     "href" : "/rak_kuvat"
                       // },
                       {
                            "title" : imgsA,
                            "href" : "/ark_kuvat"
                        }, {
                            "title" : mapsA,
                            "href" : "/ark_kartat"
                        }
                    ];

                    return subTabList;
				},
				/*
				 * Archeology subtabs
				 */
				getArcSubTabs : function () {
					var research = locale.getString('common.Researches');
					var targets = locale.getString('ark.Targets');
					var discoveries = locale.getString('ark.Discoveries');
					var samples = locale.getString('ark.Samples');
					var operations = locale.getString('ark.Operations');
					var treatments = locale.getString('ark.Treatments');
					var carts = locale.getString('common.Carts');
					var conservationControl = locale.getString('ark.Concervation_control');

					// Tabit näkyy annetussa järjestyksessä
					var arcSubTabList = [
						{
                            "title" : targets,
                            "href" : "/kohteet"
                        },
						{
							"title" : research,
							"href" : "/tutkimukset"
						},
						{
							"title" : discoveries,
							"href" : "/loydot"
						},
						{
							"title" : samples,
							"href" : "/naytteet"
						},
						{
							"title" : operations,
							"href" : "/toimenpiteet"
						},
						{
							"title" : treatments,
							"href" : "/kasittelyt"
						},
						{
							"title" : carts,
							"href" : "/ark_korit"
						},
						{
							"title" : conservationControl,
							"href" : "/konservointi/hallinta"
						}
					];

					return arcSubTabList;
				}
			}
			return tabFunctions;
		}
])
})();