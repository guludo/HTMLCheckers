$(document).ready(function(){
	function stringColorToNumber(color){ return color == "white" ? state.WHITE : state.BLACK; }
	function numberColorToString(color){ return color == state.WHITE ? "white"  : "black"; }
	
	Board.onFinish = function(winner){
		alert("Winner: " + numberColorToString(winner));
	};
	
	Board.onTurnStart = function(turn){
		var color = numberColorToString(turn);
		$('fieldset[data-color="' + color + '"]').attr('data-turn', 1);
	};
	
	Board.onTurnEnd = function(turn){
		var color = numberColorToString(turn);
		$('fieldset[data-color="' + color + '"]').removeAttr('data-turn');
		$('.invalid-move-message').css('visibility', 'hidden');
	};
	
	Board.onInvalidMove = function(message){
		$('.invalid-move-message[data-color="' + numberColorToString(Board.state.turn) + '"]').text(message).css('visibility', 'visible');
	};
	
	var EventHandlers = {
		playerTypeChange : function(evt){
			Board.playerType[evt.data.color] = $(this).val();
			
			evt.data.container.attr("data-type", $(this).val());
			
			if(Board.state.turn == evt.data.color) Board.onMove();
		},
		playerLevelChange : function(evt){
			Board.playerDifficulty[evt.data.color] = parseInt($(this).val());
		},
		restart : function(){
			Board.reset();
			Board.onMove();
		}
	};
	
	$('#players fieldset').each(function(){
		var color = stringColorToNumber($(this).attr('data-color'));
		var data = {color : color, container : $(this)};
		$(this).find('select[data-name="type"]').bind('change', data, EventHandlers.playerTypeChange);
		$(this).find('select[data-name="level"]').bind('change', data, EventHandlers.playerLevelChange);
	});
	
	$('input[type=checkbox][data-option]').click(function(){
		Board.options[$(this).attr('data-name')] = $(this).prop('checked');
	});
	
	$('#options > div:first-child').click(function(){
		$(this).nextAll('ul').toggle(300);
	});
	
	$('#bt-restart').click(EventHandlers.restart);
});