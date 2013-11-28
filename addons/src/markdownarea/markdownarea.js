(function(global, $, UI){

    var Markdownarea = function(element, options){

        var $element = $(element);

        if($element.data("markdownarea")) return;

        this.element = $element;
        this.options = $.extend({}, Markdownarea.defaults, options);

        this.init();

        this.element.data("markdownarea", this);
    };

    $.extend(Markdownarea.prototype, {

        init: function(){

            var $this = this, tpl = Markdownarea.template;

            tpl = tpl.replace(/\{\:lblPreview\}/g, this.options.lblPreview);
            tpl = tpl.replace(/\{\:lblCodeview\}/g, this.options.lblCodeview);

            this.markdownarea = $(tpl);
            this.container    = this.markdownarea.find(".uk-markdownarea-container");
            this.toolbar      = this.markdownarea.find(".uk-markdownarea-toolbar");
            this.preview      = this.markdownarea.find(".uk-markdownarea-preview").children().eq(0);
            this.code         = this.markdownarea.find(".uk-markdownarea-code");

            this.element.before(this.markdownarea).appendTo(this.code);

            this.editor   = CodeMirror.fromTextArea(this.element[0], this.options.codemirror);

            this.editor.on("change", (function(){
                var render = function(){

                    var value    = $this.editor.getValue();

                    marked(value, function (err, markdown) {

                      if (err) throw err;

                      $this.preview.html(markdown);
                      $this.element.val(value).trigger("update", [$this]);
                    });
                };
                render();
                return render;
            })());

            this._buildtoolbar();
            this.fit();

            $(window).on("resize", UI.Utils.debounce(function(){
                $this.fit();
            }, 200));


            var codeContent     = this.code.find('.CodeMirror-sizer'),
                codeScroll      = this.code.find('.CodeMirror-scroll').on('scroll',UI.Utils.debounce(function() {

                    if($this.markdownarea.attr("data-mode")=="tab") return;

                    // calc position
                    var codeHeight       = codeContent.height()   - codeScroll.height(),
                        previewHeight    = $this.preview[0].scrollHeight - $this.preview.height(),
                        ratio            = previewHeight / codeHeight,
                        previewPostition = codeScroll.scrollTop() * ratio;

                    // apply new scroll
                    $this.preview.scrollTop(previewPostition);
            }, 10));

            this.markdownarea.on("click", ".uk-markdown-button-markdown, .uk-markdown-button-preview", function(e){

                e.preventDefault();

                if($this.markdownarea.attr("data-mode")=="tab") {

                    $this.activetab = $(this).hasClass("uk-markdown-button-markdown") ? "code":"preview";
                    $this.markdownarea.attr("data-active-tab", $this.activetab);
                }
            });

            this.preview.css("height", this.code.height());
        },

        _buildtoolbar: function(){

            if(!(this.options.toolbar && this.options.toolbar.length)) return;

            var $this = this, bar = [];

            this.options.toolbar.forEach(function(cmd){
                if(Markdownarea.commands[cmd]) {

                   var title = Markdownarea.commands[cmd].title ? Markdownarea.commands[cmd].title : cmd;

                   bar.push('<li><a data-markdownarea-cmd="'+cmd+'" title="'+title+'" data-uk-tooltip>'+Markdownarea.commands[cmd].label+'</a></li>');

                   if(Markdownarea.commands[cmd].shortcut) {
                       $this.registerShortcut(Markdownarea.commands[cmd].shortcut, Markdownarea.commands[cmd].action);
                   }
                }
            });

            this.toolbar.html(bar.join("\n")).on("click", "a[data-markdownarea-cmd]", function(){
                var cmd = $(this).data("markdownareaCmd");

                if(cmd && Markdownarea.commands[cmd]) {
                    Markdownarea.commands[cmd].action.apply($this, [$this.editor])
                }

            });
        },

        fit: function() {

            var mode = this.options.mode;

            if(mode=="split" && this.markdownarea.width() < this.options.maxsplitsize) {
                mode = "tab";
            }

            if(mode=="tab") {

                if(!this.activetab) {
                    this.activetab = "code";
                    this.markdownarea.attr("data-active-tab", this.activetab);
                }
            }

            this.markdownarea.attr("data-mode", mode);
        },

        registerShortcut: function(combination, callback){

            var $this = this;

            combination = $.isArray(combination) ? combination : [combination];

            for(var i=0,max=combination.length;i < max;i++) {
                var map = {};

                map[combination[i]] = function(){
                    callback.apply($this, [$this.editor]);
                };

                $this.editor.addKeyMap(map);
            }
        }
    });

    //jQuery plugin

    $.fn.markdownarea = function(options){

        return this.each(function(){

            var ele = $(this);

            if(!ele.data("markdownarea")) {
                var obj = new Markdownarea(ele, options);
            }
        });
    };

    var baseReplacer = function(replace, editor){
        var text     = editor.getSelection(),
            markdown = replace.replace('$1', text);

        editor.replaceSelection(markdown, 'end');
    };

    Markdownarea.commands = {
        "bold" : {
            "title"  : "Bold",
            "label"  : '<i class="uk-icon-bold"></i>',
            "shortcut": ['Ctrl-B', 'Cmd-B'],
            "action" : function(editor){

                baseReplacer("**$1**", editor);
            }
        },
        "italic" : {
            "title"  : "Italic",
            "label"  : '<i class="uk-icon-italic"></i>',
            "action" : function(editor){
                baseReplacer("*$1*", editor);
            }
        },
        "strike" : {
            "title"  : "Strikethrough",
            "label"  : '<i class="uk-icon-strikethrough"></i>',
            "action" : function(editor){
                baseReplacer("~~$1~~", editor);
            }
        },
        "blockquote" : {
            "title"  : "Blockquote",
            "label"  : '<i class="uk-icon-quote-right"></i>',
            "action" : function(editor){
                baseReplacer("> $1", editor);
            }
        },
        "link" : {
            "title"  : "Link",
            "label"  : '<i class="uk-icon-link"></i>',
            "action" : function(editor){
                baseReplacer("[$1](http://)", editor);
            }
        },
        "picture" : {
            "title"  : "Picture",
            "label"  : '<i class="uk-icon-picture"></i>',
            "action" : function(editor){
                baseReplacer("![$1](http://)", editor);
            }
        },
        "listUl" : {
            "title"  : "Unordered List",
            "label"  : '<i class="uk-icon-list-ul"></i>',
            "action" : function(editor){
                baseReplacer("* $1", editor);
            }
        },
        "listOl" : {
            "title"  : "Ordered List",
            "label"  : '<i class="uk-icon-list-ol"></i>',
            "action" : function(editor){
                baseReplacer("1. $1", editor);
            }
        }
    }

    Markdownarea.defaults = {
        "mode"         : "split",
        "maxsplitsize" : 1000,
        "codemirror"   : { mode: 'gfm', tabMode: 'indent', tabindex: "2", lineWrapping: true, dragDrop: false },
        "toolbar"      : [ "bold", "italic", "strike", "link", "picture", "blockquote", "listUl", "listOl" ],
        "lblPreview"   : "Preview",
        "lblCodeview"  : "Markdown"
    };

    Markdownarea.template = '<div class="uk-markdownarea uk-clearfix" data-mode="split">' +
                                '<div class="uk-markdownarea-navbar">' +
                                    '<ul class="uk-markdownarea-navbar-nav uk-markdownarea-toolbar"></ul>' +
                                    '<div class="uk-markdownarea-navbar-flip">' +
                                        '<ul class="uk-markdownarea-navbar-nav">' +
                                            '<li class="uk-markdown-button-markdown"><a>{:lblCodeview}</a></li>' +
                                            '<li class="uk-markdown-button-preview"><a>{:lblPreview}</a></li>' +
                                            '<li><a><i class="uk-icon-resize-full"></i></a></li>' +
                                        '</ul>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="uk-markdownarea-content">' +
                                    '<div class="uk-markdownarea-code"><div></div></div>' +
                                    '<div class="uk-markdownarea-preview"><div></div></div>' +
                                '</div>' +
                            '</div>';

    UI["markdownarea"] = Markdownarea;

    // init code
    $(function() {

        marked.setOptions({
          gfm: true,
          tables: true,
          breaks: true,
          pedantic: false,
          sanitize: false,
          smartLists: true,
          smartypants: false,
          langPrefix: 'lang-'
        });

        $("textarea[data-uk-markdownarea]").each(function() {
            var area = $(this), obj;

            if (!area.data("markdownarea")) {
                obj = new Markdownarea(area, UI.Utils.options(area.attr("data-uk-markdownarea")));
            }
        });
    });

})(window, jQuery, jQuery.UIkit);