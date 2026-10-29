import { render,screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe,expect,it,vi } from 'vitest';
import { Dropdown } from './Dropdown';
describe('account/workspace dropdown interaction',()=>{
  it('supports keyboard opening, arrow navigation, Escape and restored trigger focus',async()=>{
    const user=userEvent.setup();render(<Dropdown label="Account menu" trigger="Account"><button role="menuitem">Account details</button><button role="menuitem">Sign out</button></Dropdown>);
    const trigger=screen.getByRole('button',{name:'Account menu'});trigger.focus();await user.keyboard('{ArrowDown}');expect(screen.getByRole('menuitem',{name:'Account details'})).toHaveFocus();await user.keyboard('{ArrowDown}');expect(screen.getByRole('menuitem',{name:'Sign out'})).toHaveFocus();await user.keyboard('{Escape}');expect(screen.queryByRole('menu')).not.toBeInTheDocument();expect(trigger).toHaveFocus();await user.keyboard('{ArrowUp}');expect(screen.getByRole('menuitem',{name:'Sign out'})).toHaveFocus();
  });
  it('lets Tab leave the popup in document order in either direction',async()=>{
    const user=userEvent.setup();render(<><button>Before</button><Dropdown label="Account menu" trigger="Account"><button role="menuitem">Sign out</button></Dropdown><button>After</button></>);
    await user.click(screen.getByRole('button',{name:'Account menu'}));await user.tab();expect(screen.getByRole('button',{name:'After'})).toHaveFocus();expect(screen.queryByRole('menu')).not.toBeInTheDocument();await user.click(screen.getByRole('button',{name:'Account menu'}));await user.tab({shift:true});expect(screen.getByRole('button',{name:'Before'})).toHaveFocus();
  });
  it('dismisses on outside interaction and runs a selected action once',async()=>{
    const user=userEvent.setup(),action=vi.fn();render(<><Dropdown label="Account menu" trigger="Account"><button role="menuitem" onClick={action}>Sign out</button></Dropdown><button>Outside</button></>);
    await user.click(screen.getByRole('button',{name:'Account menu'}));await user.click(screen.getByRole('button',{name:'Outside'}));expect(screen.queryByRole('menu')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Outside'})).toHaveFocus();await user.click(screen.getByRole('button',{name:'Account menu'}));await user.click(screen.getByRole('menuitem',{name:'Sign out'}));expect(action).toHaveBeenCalledTimes(1);expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
