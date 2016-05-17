var C2;
C2 = (function() {
  
  function C2(config){
    config = config || {};
    this.config = {
      actionBar:      '#action-bar-wrapper',
      attachmentCard: '#card-for-attachments',
      detailsForm:    '#request-details-card',
      detailsSave:    '#request-details-card',
      activityCard:   '#card-for-activity',
      editMode:       '#mode-parent',
      formState:      '#request-details-card',
      undoCheck:      '#request-details-card form',
      notifications:  '#action-bar-status',
      observerCard:   '#card-for-observers',
      cancelCard:     '#card-for-cancel'
    }
    this._overrideTestConfig(config);
    this._blastOff();
  }

  C2.prototype._blastOff = function(){
    this._setupStates();
    this._setupViews();
    this._setupData();
    this._setupEvents();
  }

  C2.prototype._overrideTestConfig = function(config){
    var opt = this.config;
    $.each(opt, function(key, item){
      if(config[key]){
        opt[key] = config[key];
      }
    });
    this.config = opt;
  }

  C2.prototype._setupData = function(){
    var detailsConfig = this.config.detailsSave;
    var undoConfig = this.config.undoCheck;
    this.detailsSave = new DetailsSave(detailsConfig);
    this.undoCheck = new UndoCheck(undoConfig);
  }

  C2.prototype._setupStates = function(){
    var config = this.config;
    this.editMode = new EditStateController(config.editMode);
    this.formState = new DetailsRequestFormState(config.formState);
  }
  
  C2.prototype._setupViews = function(){
    var config = this.config;
    this.detailsRequestCard = new DetailsRequestCard(config.detailsForm);
    this.attachmentCardController = new AttachmentCardController(config.attachmentCard);
    this.observerCardController = new ObserverCardController(config.observerCard);
    this.activityCardController = new ActivityCardController(config.activityCard);
    this.cancelCardController = new CancelCardController(config.cancelCard);
    this.actionBar = new ActionBar(config.actionBar);
    this.notification = new Notifications(config.notifications);
  }

  C2.prototype._setupEvents = function(){
    this._checkFieldChange();
    this._setupActionBar();
    this._setupEditToggle();
    this._setupDetailsData();
    this._setupDetailsForm();
    this._setupEditMode();
    this._setupNotifications();
    this._setupActivityEvent();
  }
  
  /**
   * data['title']
   * data['content']
   * data['status']
   * data['timeout'] (optional)
   */
  C2.prototype._setupNotifications = function(){
    var self = this;  
    this.notification.el.on('notification:create', function(event, data){
      console.log('Notification: ', data);
      self.notification.create(data);
    });
  }

  C2.prototype._setupEditMode = function(){
    var self = this;  
    this.editMode.el.on('edit-mode:has-changed', function(){
      self.actionBar.editMode();
    });
    this.editMode.el.on('edit-mode:not-changed', function(){
      self.actionBar.viewMode();
    });
  }

  C2.prototype._setupDetailsForm = function(){
    var self = this;  
    this.detailsRequestCard.el.on('form:updated', function(event, data){
      self.detailsSaved(data);
    });
  }

  C2.prototype._setupDetailsData = function(){
    var self = this;
    this.detailsSave.el.on('details-form:success', function(event, data){
      self.detailsRequestCard.updateViewModeContent(data);
    });

    this.detailsSave.el.on('details-form:error', function(event, data){
      self.handleSaveError(data);
      self.actionBar.saveButtonLadda.ladda( 'stop' );
    });
  }

  C2.prototype.handleSaveError = function(data){
    console.log("C2.prototype.handleSaveError: ", data);
    var response = data['response'];
    for (var i = response.length - 1; i >= 0; i--) {
      this.notification.el.trigger('notification:create', {
        title: "Request Not Saved",
        content: response[i],
        type: "alert"
      });
    }
  }

  C2.prototype._setupEditToggle = function(){
    var self = this;
    this.detailsRequestCard.el.on('edit-toggle:trigger', function(){
      console.log('self.editMode.getState(): ', self.editMode.getState());
      if(!self.editMode.getState()){
        self.detailsEditMode();
      } else {
        if(self.undoCheck.hasChanged()){
          self.detailsCancelled();
        } else {
          self.detailsView();
        }
      }
    });
  }

  C2.prototype._checkFieldChange = function(){
    var self = this;
    this.detailsRequestCard.el.on('form:changed', function(){
      if(self.undoCheck.hasChanged()){
        self.editMode.el.trigger('edit-mode:has-changed');
      } else {
        self.editMode.el.trigger('edit-mode:not-changed');
      }
    });
  }

  C2.prototype._setupActionBar = function(){
    var self = this;
    this.actionBar.el.on("action-bar-clicked:cancel", function(){
      self.detailsCancelled();
    });
    this.actionBar.el.on("action-bar-clicked:save", function(){
      self.actionBar.el.trigger("action-bar-clicked:saving");
      self.detailsSave.el.trigger("details-form:save");
    });
  }

  C2.prototype._setupActivityEvent = function(){
    var self = this;
    this.attachmentCardController.el.on("attachment-card:updated", function(event, data){
      self.activityCardController.el.trigger('activity-card:update');
      self.createActivityNotification(data);
    });
  }

  C2.prototype.createActivityNotification = function(data){
    var params = {
      title: "Attachment " + data.actionType,
      type: data.noticeType
    };
    if (data.actionType === "delete"){
      params.content =  data.fileName + " was deleted successfully.";
    } else if (data.actionType === "create"){
      params.content = data.fileName + " was uploaded successfully.";
    }
    this.notification.el.trigger('notification:create', params);
  }

  C2.prototype.detailsCancelled = function(){
    this.editMode.stateTo('view');
    this.undoCheck.el.trigger("undo-check:cancel");
    this.actionBar.viewMode();
    this.actionBar.cancelDisable();
    this.undoCheck.viewed = true;
    this.notification.el.trigger('notification:create', {
      title: "Canceled Change",
      content: "",
      type: "notice"
    });
  }
 
  C2.prototype.processSaveRequest = function(){
  }
  
  C2.prototype.detailsSaved = function(data){
    this.undoCheck.el.trigger("undo-check:save");
    this.actionBar.el.trigger("action-bar-clicked:saved");
    this.detailsView();
    this.notification.el.trigger('notification:create', {
      title: "Changes Saved",
      content: "Your changes were saved.",
      type: "success"
    });
  }
  
  C2.prototype.detailsEditMode = function(){
    this.detailsRequestCard.el.trigger('form:changed');
    this.actionBar.cancelActive();
    this.editMode.stateTo('edit');
    this.detailsRequestCard.toggleButtonText('Cancel');
  }

  C2.prototype.detailsView = function(){
    this.actionBar.cancelDisable();
    this.editMode.stateTo('view');
    this.undoCheck.el.trigger("undo-check:cancel");
    this.actionBar.viewMode();
    this.detailsRequestCard.toggleButtonText('Edit');
    this.undoCheck.viewed = true;
  }

  return C2;

}());

window.C2 = C2;