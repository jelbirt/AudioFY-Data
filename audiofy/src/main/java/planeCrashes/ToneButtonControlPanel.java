/* @Author Jacob Elbirt
*	AudioFY Project created during 2023 Summer Aisiku Research Fellowship
*	Not intended for commercial use
*/

package planeCrashes;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import javax.swing.JButton;
import javax.swing.JPanel;
import java.awt.FlowLayout;

public class ToneButtonControlPanel extends JPanel implements ActionListener {

	private static final long serialVersionUID = 1L;
	private playPanel PW = null;
	public ToneButtonControlPanel(playPanel parentWindow) {
		super();
		PW = parentWindow;

		JButton btnNewButton_2 = new JButton("REWIND");
		btnNewButton_2.setActionCommand("REWIND");
		btnNewButton_2.addActionListener(this);
		setLayout(new FlowLayout(FlowLayout.CENTER, 5, 5));
		this.add(btnNewButton_2);
		
		JButton btnNewButton = new JButton("PLAY");
		btnNewButton.setActionCommand("PLAY");
		btnNewButton.addActionListener(this);
		this.add(btnNewButton);
		
		JButton btnNewButton_1 = new JButton("PAUSE");
		btnNewButton_1.setActionCommand("PAUSE");
		btnNewButton_1.addActionListener(this);
		this.add(btnNewButton_1);
		
		JButton btnNewButton_4 = new JButton("STOP");
		btnNewButton_4.setActionCommand("STOP");
		btnNewButton_4.addActionListener(this);
		this.add(btnNewButton_4);
		
		JButton btnNewButton_3 = new JButton("FAST FORWARD");
		btnNewButton_3.setActionCommand("FAST FORWARD");
		btnNewButton_3.addActionListener(this);
		this.add(btnNewButton_3);
		
		JButton btnNewButton_5 = new JButton("PLAY TONE");
		btnNewButton_5.setActionCommand("PLAY TONE");
		btnNewButton_5.addActionListener(this);
		this.add(btnNewButton_5);

	}

	public void setPlayPanel(playPanel pp) {
		PW = pp;
	}
	
	public void actionPerformed(ActionEvent e) {
		PW.buttonAction(e.getActionCommand());
	}

}
