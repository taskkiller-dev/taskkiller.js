(function(global) {

    global.tk = global.TaskKiller = {

        token: null,

        loadLsto: function() {
            tk.token = localStorage.getItem("tk-token");
            tk.companyHost = localStorage.getItem("tk-host");
        },

        coreDomain: 'taskkiller.com.ar',
        company: '',
        companyHost: '',

        generateOAuthLink: function(data) {
            var link = tk.companyHost,
                key;
            link += "/oauth/authorize?";
            link += Object.keys(data).map(function(k) {
                return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
            }).join('&');

            return link;
        },

        setCompany: function(company) {
            tk.company = company;
            tk.setCompanyHost( "//"+company+"."+tk.coreDomain );
        },

        setCompanyHost: function(host) {
            localStorage.setItem("tk-host", host);
            tk.companyHost = host;
        },

        setToken: function(token) {
            localStorage.setItem("tk-token", token);
            tk.token = token;
        },

        emptyCallback: function(response){console.log(response)},

        resource: function(resource) {
            var res;
            switch(resource.toLowerCase()) {
                case 'project':
                    res = new ProjectResource();
                    break;

                case 'release':
                    res = new ReleaseResource();
                    break;

                case 'column':
                    res = new ColumnResource();
                    break;

                case 'issue':
                    res = new IssueResource();
                    break;

                case 'attachment':
                    res = new AttachmentResource();
                    break;

                case 'user':
                    res = new UserResource();
                    break;

                default:
                    throw new "Invalid resource"
            }
            return res;
        },

        xhrSetup: {
            headers: {}
        }

    },

    diffForHumans = function (diff) {
        var years,
            days,
            months,
            hours,
            days,
            minutes,
            seconds;

        var years = diff / 1000 / 60 / 60 / 24 / 365;
        if(years > 1) {
            return Math.floor(years) + " " + pluralize("year", "years", years) + " ago";
        } else {
            var days = years * 365;
            if(days > 1) {
                if(days < 31) {
                    return Math.floor(days) + " " + pluralize("day", "days", days) + " ago";
                } else {
                    months = days / 31;
                    return Math.floor(months) + " " + pluralize("month", "months", months) + " ago";
                }
            } else {
                hours = days * 24;
                if(hours > 1) {
                    return Math.floor(hours) + " " + pluralize("hour", "hours", hours) + " ago";
                } else {
                    minutes = hours * 60;
                    if(minutes > 1) {
                        return Math.floor(minutes) + " " + pluralize("minute", "minutes", minutes) + " ago";
                    } else {
                        seconds = minutes * 60;
                        return Math.floor(seconds) + " " + pluralize("second", "seconds", seconds) + " ago";
                    }
                }
            }
        }

    },
    pluralize = function(singular, plural, value) {
        return (Math.floor(value) == 1) ? singular: plural;
    },

    ProjectResource = function() {},
    ReleaseResource = function() {},
    ColumnResource = function() {},
    IssueResource = function() {},
    CommentResource = function() {},
    AttachmentResource = function() {},
    UserResource = function() {},
    generalSuccessFirst = function(completed, resourceConstructor, data) {
        generalSuccess.call(this, completed, resourceConstructor, data, true);
    },
    generalSuccess = function(completed, resourceConstructor, data, firstOnly) {
        /*if(typeof firstOnly == "object") {
            data = firstOnly;
            firstOnly = false;
        }*/
        if(typeof completed == "function") {
            if(data.error) {
                completed(data.error);
            } else {
                var result;
                if(data.length != void 0) {
                    if(!data.length) {
                        result = [];
                    } else {
                        if(firstOnly) {
                            result = new resourceConstructor(data[0]);
                        } else {
                            result = [];
                            data.forEach(function(resourceJson) {
                                result.push(new resourceConstructor(resourceJson));
                            });
                        }
                    }
                } else {
                    result = new resourceConstructor(data);
                }
                completed(null, result);
            }
        }
    },
    generalError = function(completed, xhr, textStatus, errorThrown) {
        typeof completed == "function" && completed(errorThrown == "Internal Server Error" ? errorThrown : (xhr.statusText || xhr.responseText));
    },
    simpleJSONSuccess = function(completed, data) {
        if(typeof completed == "function") {
            if(data.error) {
                completed(data.error);
            } else {
                completed(null, data);
            }
        }
    },
    extend = function(dest, source) {
        for(var k in source) 
            if(dest[k] === void 0) dest[k] = source[k];
        return dest;
    },
    Project = function(attrs) {
        extend(this, attrs);
    },
    Release = function(attrs) {
        extend(this, attrs);
    },
    Column = function(attrs) {
        extend(this, attrs);
    },
    Issue = function(attrs) {
        extend(this, attrs);
    },
    Comment = function(attrs) {
        extend(this, attrs);
    },
    User = function(attrs) {
        extend(this, attrs);
    }

    issueDefaults = {
        description: ''
    },

    http = {
        parseGetData: function(srcjson, parent) {
            var u = encodeURIComponent,
                urljson = [],
                keys = Object.keys(srcjson),
                len = keys.length;

            for(var i=0; i < len; i++){
              var k = parent ? parent + "[" + keys[i] + "]" : keys[i];

              if(typeof srcjson[keys[i]] !== "object"){
                urljson.push( u(k) + "=" + u(srcjson[keys[i]]) );
              } else {
                urljson.push( http.parseGetData(srcjson[keys[i]], k) );
              }
            }

            return urljson.join("&");

        },
        dataBody: 'POST|PUT|DELETE',
        perform: function(method, url, data, headers, success, error) {
            method = method.toUpperCase();
            if(typeof headers == "function") {
                error = success;
                success = headers;
                headers = {};
            }

            /*$.ajax({
                type: method, url: url, dataType: 'json',
                data: data, headers: headers, success: success, error: error
            });*/
            
            url = tk.companyHost + "/api" + url;


            /* GET FIX */
            if(data && method=="GET" && Object.keys(data).length) {
                url += '?' + http.parseGetData(data);
            }

            /* XHR BUILD */
            var xhr = new XMLHttpRequest();
            xhr.open(method, url, true);

            if(!("Content-Type" in headers)) {
                xhr.setRequestHeader('Accept', 'application/json');
                xhr.setRequestHeader('Content-Type', 'application/json');
            }

            /* HEADERS SETUP */
            if(tk.token) {
                headers['Authorization'] = "Bearer " + tk.token; 
            }
            var header;
            for(header in tk.xhrSetup.headers) {
                xhr.setRequestHeader(header, tk.xhrSetup.headers[header]);
            }
            for(header in headers) {
                headers[header] !== false && xhr.setRequestHeader(header, headers[header]);
            }

            /* CALLBACKS */
            xhr.onload = function() {
                if(this.status == 200) {
                    if(typeof success == "function") {
                        success.call(this, JSON.parse(this.response));
                    }
                } else {
                    if(typeof error == "function") {
                        error(this, 'error', this.statusText);
                    }
                }
            }



            /* SEND */
            if(http.dataBody.indexOf(method) !=-1) {
                if(!(data instanceof FormData)) {
                    data = JSON.stringify(data);
                }
            } else {
                data = null;
            }
            xhr.send( data );

        },

        get: function(url, data, headers, success, error) {
            this.perform("GET", url, data, headers, success, error);
        },

        post: function(url, data, headers, success, error) {
            this.perform("POST", url, data, headers, success, error);
        },

        put: function(url, data, headers, success, error) {
            this.perform("PUT", url, data, headers, success, error);
        },

        delete: function(url, data, headers, success, error) {
            this.perform("DELETE", url, data, headers, success, error);
        },
    },

    filterOne = function(filters, callback, url, resourceConstructor) {
        filter.call(this, filters, callback, url, resourceConstructor, true);
    },

    filter = function(filters, callback, url, resourceConstructor, firstOnly) {
        var successFunc = firstOnly ? generalSuccessFirst : generalSuccess;
        http.get(url, filters, successFunc.bind(this, callback, resourceConstructor), generalError.bind(this, callback));
    };


    ProjectResource.prototype.create = function(data, callback) {
        http.post('/projects', data, generalSuccess.bind(this, callback, Project), generalError.bind(this, callback));
    };

    ProjectResource.prototype.load = function(data) {
        return new Project(data);
    };

    ProjectResource.prototype.users = function(projectId, data, callback) {
        var url = [ '/projects', projectId, 'users' ].join('/');
        http.get(url, data, simpleJSONSuccess.bind(this, callback), generalError.bind(this, callback));
    };

    ProjectResource.prototype.filter = function(filters, callback) {
        filter.call(this, filters, callback, '/projects', Project);
    }


    ReleaseResource.prototype.filter = function(filters, callback) {
        filter.call(this, filters, callback, '/releases', Release);
    };

    ReleaseResource.prototype.find = function(releaseId, callback) {
        filterOne.call(this, null, callback, '/releases/'+releaseId, Release);
    };

    ReleaseResource.prototype.create = function(data, callback) {
        http.post('/releases', data, generalSuccess.bind(this, callback, Release), generalError.bind(this, callback));
    };

    ReleaseResource.prototype.load = function(data) {
        return new Release(data);
    };

    ReleaseResource.prototype.columns = function(releaseId, callback) {
        var url = [ '/releases', releaseId, 'columns' ].join('/');
        filter.call(this, null, callback, url, Column);
    };


    ColumnResource.prototype.load = function(data) {
        return new Column(data);
    };

    ColumnResource.prototype.find = function(columnId, callback) {
        filterOne.call(this, null, callback, '/columns/'+columnId, Column);
    };


    IssueResource.prototype.load = function(data) {
        return new Issue( extend(data, issueDefaults) );
    };

    IssueResource.prototype.find = function(issueId, callback) {
        filterOne.call(this, null, callback, '/issues/'+issueId, Issue);
    };

    IssueResource.prototype.create = function(data, callback) {
        var url = '/issues';
        http.post(url, data, generalSuccess.bind(this, callback, Issue), generalError.bind(this, callback));
    };

    AttachmentResource.prototype.delete = function(attachmentId, callback) {
        var url = '/attachments/'+attachmentId;
        http.delete(url, {}, simpleJSONSuccess.bind(this, callback), generalError.bind(this, callback));
    };


    Project.prototype.addUser = function(userId, callback) {
        var url = [ '/projects', this.id, 'users' ].join('/');
        http.post(url, {'user_id':userId}, generalSuccess.bind(this, callback, User), generalError.bind(this, callback));
    };

    Project.prototype.getBacklog = function(callback) {
        var url = [ '/projects', this.id, 'releases' ].join('/');
        var data = {
            release_type: 'backlog',
            limit: 1
        }
        http.get(url, data, generalSuccessFirst.bind(this, callback, Release), generalError.bind(this, callback));
    };


    Release.prototype.createColumn = function(data, callback) {
        var url = [ '/releases', this.id, 'columns' ].join('/');
        http.post(url, data, generalSuccess.bind(this, callback, Column), generalError.bind(this, callback));
    };

    Release.prototype.getColumns = function(data, callback) {
        var url = [ '/releases', this.id, 'columns' ].join('/');
        filter.call(this, data, callback, url, Column);
    };


    Column.prototype.createIssue = function(data, callback) {
        var url = [ '/columns', this.id, 'issues' ].join('/');
        http.post(url, data, generalSuccess.bind(this, callback, Issue), generalError.bind(this, callback));
    };


    Issue.prototype.getUsers = function(data, callback) {
        var url = ['/issues', this.id, 'users'].join('/');
        filter.call(this, data, callback, url, User);
    };

    Issue.prototype.moveTo = function(data, callback) {
        var url = [ '/issues', this.id, 'move' ].join('/');
        http.put(url, data, generalSuccess.bind(this, callback, Issue), generalError.bind(this, callback));
    };

    Issue.prototype.update = function(data, callback) {
        var url = [ '/issues', this.id ].join('/');
        for(var k in data) {
            this[k] = data[k];
        }
        http.put(url, this, generalSuccess.bind(this, callback, Issue), generalError.bind(this, callback));
    };

    Issue.prototype.postComment = function(commentText, callback) {
        var url = [ '/issues', this.id, 'comments' ].join('/');
        http.post(url, {text: commentText}, generalSuccess.bind(this, callback, Comment), generalError.bind(this, callback));
    };

    Issue.prototype.postPriority = function(priority, callback) {
      var url = [ '/issues', this.id, 'priority' ].join('/');
        http.post(url, {priority: priority}, generalSuccess.bind(this, callback, Issue), generalError.bind(this, callback));  
    };

    Issue.prototype.postType = function(type, callback) {
      var url = [ '/issues', this.id, 'type' ].join('/');
        http.post(url, {type: type}, generalSuccess.bind(this, callback, Issue), generalError.bind(this, callback));  
    };

    Issue.prototype.attach = function(file, callback) {
        var url = [ '/issues', this.id, 'attachments' ].join('/'),
            data = new FormData();


        var image = $('#input-file')[0].files[0];
        /*data.append('attachment', image);
        $.ajax({
            url: url,
            data: data,
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            cache: false,
            contentType: false,
            processData: false,
            type: 'POST',
            success:function(response) {
                console.log(response);
            }
        });*/


        data.append("attachment", image);

        http.perform("POST", url, data, {'Content-Type': false}, function(response) {
            if(typeof callback == "function") {
                if(this.status == 200) {
                    if(!response.error) {
                        return callback(null, response);
                    }
                }

                callback(response.error);
            }
        });

    };

    Issue.prototype.addUser = function(userId, callback) {
        var url = [ '/issues', this.id, 'users' ].join('/');
        http.post(url, userId, generalSuccess.bind(this, callback, User), generalError.bind(this, callback));
    };

    Issue.prototype.deleteUser = function(userId, callback) {
        var url = [ '/issues', this.id, 'users' ].join('/');
        http.delete(url, userId, generalSuccess.bind(this, callback, Issue), generalError.bind(this, callback));
    };

    Issue.prototype.prettyDate = function(date) {
        var now = new Date()
            diff = now - new Date(this[date]);
            
        return diffForHumans(diff);
    }

    UserResource.prototype.find = function(userId, callback) {
        filterOne.call(this, null, callback, '/users/'+userId, User);
    };

    UserResource.prototype.filter = function(filters, callback) {
        filter.call(this, filters, callback, '/users', User);
    }


tk.loadLsto();

})(window);
