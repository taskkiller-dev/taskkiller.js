(function(global) {

    global.tk = global.TaskKiller = {

        token: null,

        loadLsto: function() {
            tk.token = localStorage.getItem("tk_token");
            tk.companyHost = localStorage.getItem("tk_host");
        },

        sandboxHost: 'http://sandbox.taskkiller.com.ar',
        coreHost: 'http://taskkiller.com.ar',
        companyHost: '',

        emptyCallback: function(response){console.log(response)},

        authorize: function(data) {
            var dataToSend = {
                company: data.company,
                appKey: data.appKey
            };
            http.perform('POST', tk.coreHost + '/api/authorize', dataToSend, function(response) {
                data.error || ( data.error = tk.emptyCallback );
                data.success || ( data.success = tk.emptyCallback );
                if( response.error || (response.tk_token == void 0 && !response.status) ) {

                    data.error(response);

                } else {

                    if(response.tk_token) {
                        localStorage.setItem("tk_token", response.tk_token);
                        localStorage.setItem("tk_host", response.tk_host);
                        tk.loadLsto();
                    }

                    data.success(response);

                }
            });
        },

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

                case 'member':
                    res = new MemberResource();
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

    ProjectResource = function() {},
    ReleaseResource = function() {},
    ColumnResource = function() {},
    IssueResource = function() {},
    CommentResource = function() {},
    AttachmentResource = function() {},
    MemberResource = function() {},
    generalSuccess = function(completed, resourceConstructor, data) {
        if(typeof completed == "function") {
            if(data.error) {
                completed(data.error);
            } else {
                var result = [];
                if(data.length) {
                    data.forEach(function(resourceJson) {
                        result.push(new resourceConstructor(resourceJson));
                    });
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
    Member = function(attrs) {
        extend(this, attrs);
    }

    issueDefaults = {
        description: ''
    },

    http = {
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
            var isAuthorize = url.indexOf("authorize") != -1;
            if(!isAuthorize) {
                url = tk.companyHost + "/api" + url;
            }


            /* GET FIX */
            if(data && method=="GET" && Object.keys(data).length) {
                var new_data = [],
                    key, value,
                    valueLen;
                for(key in data) {
                    value = data[key];
                    valueLen = value.length
                    if(typeof value == "object" && valueLen) {
                        var ek = encodeURIComponent(key)+'[]';
                        for (var i = 0; i < valueLen; i++) new_data.push( ek+'='+encodeURIComponent(value[i]) );
                    } else {
                        new_data.push( encodeURIComponent(key)+'='+encodeURIComponent(value) );
                    }
                };
                url += '?'+new_data.join('&');
            }

            /* XHR BUILD */
            var xhr = new XMLHttpRequest();
            xhr.open(method, url, !isAuthorize);

            if(!("Content-Type" in headers)) {
                xhr.setRequestHeader('Accept', 'application/json');
                xhr.setRequestHeader('Content-Type', 'application/json');
            }

            /* HEADERS SETUP */
            if(tk.token) {
                headers['Authorization'] = "Bearer: " + tk.token; 
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

    filter = function(filters, callback, url, resourceConstructor) {
        http.get(url, filters, generalSuccess.bind(this, callback, resourceConstructor), generalError.bind(this, callback));
    };


    ProjectResource.prototype.create = function(data, callback) {
        http.post('/projects', data, generalSuccess.bind(this, callback, Project), generalError.bind(this, callback));
    };

    ProjectResource.prototype.load = function(data) {
        return new Project(data);
    };

    ProjectResource.prototype.members = function(projectId, callback) {
        var url = [ '/projects', projectId, 'members' ].join('/');
        http.get(url, {}, simpleJSONSuccess.bind(this, callback), generalError.bind(this, callback));
    };


    ReleaseResource.prototype.filter = function(filters, callback) {
        filter.call(this, filters, callback, '/releases', Release);
    };

    ReleaseResource.prototype.find = function(releaseId, callback) {
        filter.call(this, null, callback, '/releases/'+releaseId, Release);
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
        filter.call(this, null, callback, '/columns/'+columnId, Column);
    };


    IssueResource.prototype.load = function(data) {
        return new Issue( extend(data, issueDefaults) );
    };

    IssueResource.prototype.find = function(issueId, callback) {
        filter.call(this, null, callback, '/issues/'+issueId, Issue);
    };

    IssueResource.prototype.create = function(data, callback) {
        var url = '/issues';
        http.post(url, data, generalSuccess.bind(this, callback, Issue), generalError.bind(this, callback));
    };

    AttachmentResource.prototype.delete = function(attachmentId, callback) {
        var url = '/attachments/'+attachmentId;
        http.delete(url, {}, simpleJSONSuccess.bind(this, callback), generalError.bind(this, callback));
    };


    Project.prototype.addMember = function(memberId, callback) {
        var url = [ '/projects', this.id, 'members' ].join('/');
        http.post(url, {'user_id':memberId}, generalSuccess.bind(this, callback, Member), generalError.bind(this, callback));
    };


    Release.prototype.createColumn = function(data, callback) {
        var url = [ '/releases', this.id, 'columns' ].join('/');
        http.post(url, data, generalSuccess.bind(this, callback, Column), generalError.bind(this, callback));
    };


    Column.prototype.createIssue = function(data, callback) {
        var url = [ '/columns', this.id, 'issues' ].join('/');
        http.post(url, data, generalSuccess.bind(this, callback, Issue), generalError.bind(this, callback));
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

    Issue.prototype.addMember = function(memberId, callback) {
        var url = [ '/issues', this.id, 'members' ].join('/');
        http.post(url, memberId, generalSuccess.bind(this, callback, Member), generalError.bind(this, callback));
    };

    Issue.prototype.deleteMember = function(memberId, callback) {
        var url = [ '/issues', this.id, 'members' ].join('/');
        http.delete(url, memberId, generalSuccess.bind(this, callback, Issue), generalError.bind(this, callback));
    };

    MemberResource.prototype.find = function(memberId, callback) {
        filter.call(this, null, callback, '/users/'+memberId, Member);
    };


tk.loadLsto()

})(window);
