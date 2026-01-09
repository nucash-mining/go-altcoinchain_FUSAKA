// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package contract

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
)

// Validator represents a validator in the staking contract
type Validator struct {
	Stake                  *big.Int
	ActivationBlock        *big.Int
	WithdrawalRequestBlock *big.Int
	WithdrawalRequestTime  *big.Int
	PendingRewards         *big.Int
	TotalRewardsClaimed    *big.Int
	Active                 bool
	Slashed                bool
}

// ValidatorStakingABI is the input ABI used to generate the binding from.
const ValidatorStakingABI = `[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"validator","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardsClaimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"totalAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"validatorCount","type":"uint256"}],"name":"RewardsDistributed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"validator","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"string","name":"reason","type":"string"}],"name":"Slashed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"validator","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newTotal","type":"uint256"}],"name":"StakeAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"validator","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"activationBlock","type":"uint256"}],"name":"Staked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"validator","type":"address"},{"indexed":false,"internalType":"uint256","name":"block","type":"uint256"}],"name":"ValidatorActivated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"validator","type":"address"},{"indexed":false,"internalType":"uint256","name":"block","type":"uint256"}],"name":"ValidatorDeactivated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"validator","type":"address"},{"indexed":false,"internalType":"uint256","name":"requestBlock","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"requestTime","type":"uint256"}],"name":"WithdrawalRequested","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"validator","type":"address"},{"indexed":false,"internalType":"uint256","name":"stakeAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"rewardsAmount","type":"uint256"}],"name":"Withdrawn","type":"event"},{"inputs":[],"name":"ACTIVATION_DELAY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MIN_STAKE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"SLASH_PERCENTAGE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"WITHDRAWAL_DELAY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"activeValidatorCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"addStake","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"canAttest","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"claimRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"attesters","type":"address[]"}],"name":"distributeRewards","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"getActiveValidators","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllValidators","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"getValidator","outputs":[{"components":[{"internalType":"uint256","name":"stake","type":"uint256"},{"internalType":"uint256","name":"activationBlock","type":"uint256"},{"internalType":"uint256","name":"withdrawalRequestBlock","type":"uint256"},{"internalType":"uint256","name":"withdrawalRequestTime","type":"uint256"},{"internalType":"uint256","name":"pendingRewards","type":"uint256"},{"internalType":"uint256","name":"totalRewardsClaimed","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"bool","name":"slashed","type":"bool"}],"internalType":"struct ValidatorStaking.Validator","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getValidatorCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"getValidatorRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"getValidatorStake","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"getWithdrawalTimeRemaining","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"isValidator","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"requestWithdrawal","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"validator","type":"address"},{"internalType":"string","name":"reason","type":"string"}],"name":"slash","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"stake","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"totalSlashed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalStaked","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"validatorList","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"validators","outputs":[{"internalType":"uint256","name":"stake","type":"uint256"},{"internalType":"uint256","name":"activationBlock","type":"uint256"},{"internalType":"uint256","name":"withdrawalRequestBlock","type":"uint256"},{"internalType":"uint256","name":"withdrawalRequestTime","type":"uint256"},{"internalType":"uint256","name":"pendingRewards","type":"uint256"},{"internalType":"uint256","name":"totalRewardsClaimed","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"bool","name":"slashed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]`

// ValidatorStakingFuncSigs maps the 4-byte function signature to its string representation.
var ValidatorStakingFuncSigs = map[string]string{
	"3a4b66f1": "stake()",
	"5c19a95c": "addStake()",
	"9fa6dd35": "requestWithdrawal()",
	"3ccfd60b": "withdraw()",
	"372500ab": "claimRewards()",
	"a217fddf": "distributeRewards(address[])",
	"facd743b": "getValidator(address)",
	"f3513a37": "getActiveValidators()",
	"47428e7b": "getAllValidators()",
	"facd743c": "isValidator(address)",
	"cb8a616b": "canAttest(address)",
	"d4a536f6": "getValidatorStake(address)",
	"a17c76c9": "getValidatorRewards(address)",
	"8a11d7c9": "getValidatorCount()",
	"817b1cd2": "totalStaked()",
	"e3eece26": "activeValidatorCount()",
}

// ValidatorStaking is an auto generated Go binding around an Ethereum contract.
type ValidatorStaking struct {
	ValidatorStakingCaller     // Read-only binding to the contract
	ValidatorStakingTransactor // Write-only binding to the contract
	ValidatorStakingFilterer   // Log filterer for contract events
}

// ValidatorStakingCaller is an auto generated read-only Go binding around an Ethereum contract.
type ValidatorStakingCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ValidatorStakingTransactor is an auto generated write-only Go binding around an Ethereum contract.
type ValidatorStakingTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ValidatorStakingFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type ValidatorStakingFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ValidatorStakingSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type ValidatorStakingSession struct {
	Contract     *ValidatorStaking // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// ValidatorStakingCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type ValidatorStakingCallerSession struct {
	Contract *ValidatorStakingCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts           // Call options to use throughout this session
}

// ValidatorStakingTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type ValidatorStakingTransactorSession struct {
	Contract     *ValidatorStakingTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts           // Transaction auth options to use throughout this session
}

// ValidatorStakingRaw is an auto generated low-level Go binding around an Ethereum contract.
type ValidatorStakingRaw struct {
	Contract *ValidatorStaking // Generic contract binding to access the raw methods on
}

// ValidatorStakingCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type ValidatorStakingCallerRaw struct {
	Contract *ValidatorStakingCaller // Generic read-only contract binding to access the raw methods on
}

// ValidatorStakingTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type ValidatorStakingTransactorRaw struct {
	Contract *ValidatorStakingTransactor // Generic write-only contract binding to access the raw methods on
}

// NewValidatorStaking creates a new instance of ValidatorStaking, bound to a specific deployed contract.
func NewValidatorStaking(address common.Address, backend bind.ContractBackend) (*ValidatorStaking, error) {
	contract, err := bindValidatorStaking(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &ValidatorStaking{ValidatorStakingCaller: ValidatorStakingCaller{contract: contract}, ValidatorStakingTransactor: ValidatorStakingTransactor{contract: contract}, ValidatorStakingFilterer: ValidatorStakingFilterer{contract: contract}}, nil
}

// NewValidatorStakingCaller creates a new read-only instance of ValidatorStaking, bound to a specific deployed contract.
func NewValidatorStakingCaller(address common.Address, caller bind.ContractCaller) (*ValidatorStakingCaller, error) {
	contract, err := bindValidatorStaking(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &ValidatorStakingCaller{contract: contract}, nil
}

// NewValidatorStakingTransactor creates a new write-only instance of ValidatorStaking, bound to a specific deployed contract.
func NewValidatorStakingTransactor(address common.Address, transactor bind.ContractTransactor) (*ValidatorStakingTransactor, error) {
	contract, err := bindValidatorStaking(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &ValidatorStakingTransactor{contract: contract}, nil
}

// NewValidatorStakingFilterer creates a new log filterer instance of ValidatorStaking, bound to a specific deployed contract.
func NewValidatorStakingFilterer(address common.Address, filterer bind.ContractFilterer) (*ValidatorStakingFilterer, error) {
	contract, err := bindValidatorStaking(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &ValidatorStakingFilterer{contract: contract}, nil
}

// bindValidatorStaking binds a generic wrapper to an already deployed contract.
func bindValidatorStaking(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(ValidatorStakingABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_ValidatorStaking *ValidatorStakingRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _ValidatorStaking.Contract.ValidatorStakingCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_ValidatorStaking *ValidatorStakingRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ValidatorStaking.Contract.ValidatorStakingTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_ValidatorStaking *ValidatorStakingRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _ValidatorStaking.Contract.ValidatorStakingTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_ValidatorStaking *ValidatorStakingCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _ValidatorStaking.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_ValidatorStaking *ValidatorStakingTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ValidatorStaking.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_ValidatorStaking *ValidatorStakingTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _ValidatorStaking.Contract.contract.Transact(opts, method, params...)
}

// ActiveValidatorCount is a free data retrieval call binding the contract method 0xe3eece26.
func (_ValidatorStaking *ValidatorStakingCaller) ActiveValidatorCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _ValidatorStaking.contract.Call(opts, &out, "activeValidatorCount")
	if err != nil {
		return nil, err
	}
	return out[0].(*big.Int), nil
}

// TotalStaked is a free data retrieval call binding the contract method 0x817b1cd2.
func (_ValidatorStaking *ValidatorStakingCaller) TotalStaked(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _ValidatorStaking.contract.Call(opts, &out, "totalStaked")
	if err != nil {
		return nil, err
	}
	return out[0].(*big.Int), nil
}

// GetValidator is a free data retrieval call binding the contract method 0xfacd743b.
func (_ValidatorStaking *ValidatorStakingCaller) GetValidator(opts *bind.CallOpts, addr common.Address) (Validator, error) {
	var out []interface{}
	err := _ValidatorStaking.contract.Call(opts, &out, "getValidator", addr)
	if err != nil {
		return Validator{}, err
	}
	return *abi.ConvertType(out[0], new(Validator)).(*Validator), nil
}

// GetActiveValidators is a free data retrieval call binding the contract method 0xf3513a37.
func (_ValidatorStaking *ValidatorStakingCaller) GetActiveValidators(opts *bind.CallOpts) ([]common.Address, error) {
	var out []interface{}
	err := _ValidatorStaking.contract.Call(opts, &out, "getActiveValidators")
	if err != nil {
		return nil, err
	}
	return *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address), nil
}

// GetAllValidators is a free data retrieval call binding the contract method 0x47428e7b.
func (_ValidatorStaking *ValidatorStakingCaller) GetAllValidators(opts *bind.CallOpts) ([]common.Address, error) {
	var out []interface{}
	err := _ValidatorStaking.contract.Call(opts, &out, "getAllValidators")
	if err != nil {
		return nil, err
	}
	return *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address), nil
}

// IsValidator is a free data retrieval call binding the contract method 0xfacd743c.
func (_ValidatorStaking *ValidatorStakingCaller) IsValidator(opts *bind.CallOpts, addr common.Address) (bool, error) {
	var out []interface{}
	err := _ValidatorStaking.contract.Call(opts, &out, "isValidator", addr)
	if err != nil {
		return false, err
	}
	return out[0].(bool), nil
}

// CanAttest is a free data retrieval call binding the contract method 0xcb8a616b.
func (_ValidatorStaking *ValidatorStakingCaller) CanAttest(opts *bind.CallOpts, addr common.Address) (bool, error) {
	var out []interface{}
	err := _ValidatorStaking.contract.Call(opts, &out, "canAttest", addr)
	if err != nil {
		return false, err
	}
	return out[0].(bool), nil
}

// GetValidatorStake is a free data retrieval call binding the contract method 0xd4a536f6.
func (_ValidatorStaking *ValidatorStakingCaller) GetValidatorStake(opts *bind.CallOpts, addr common.Address) (*big.Int, error) {
	var out []interface{}
	err := _ValidatorStaking.contract.Call(opts, &out, "getValidatorStake", addr)
	if err != nil {
		return nil, err
	}
	return out[0].(*big.Int), nil
}

// GetValidatorRewards is a free data retrieval call binding the contract method 0xa17c76c9.
func (_ValidatorStaking *ValidatorStakingCaller) GetValidatorRewards(opts *bind.CallOpts, addr common.Address) (*big.Int, error) {
	var out []interface{}
	err := _ValidatorStaking.contract.Call(opts, &out, "getValidatorRewards", addr)
	if err != nil {
		return nil, err
	}
	return out[0].(*big.Int), nil
}

// GetValidatorCount is a free data retrieval call binding the contract method 0x8a11d7c9.
func (_ValidatorStaking *ValidatorStakingCaller) GetValidatorCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _ValidatorStaking.contract.Call(opts, &out, "getValidatorCount")
	if err != nil {
		return nil, err
	}
	return out[0].(*big.Int), nil
}

// MinStake is a free data retrieval call binding the contract method 0x375b3c0a.
func (_ValidatorStaking *ValidatorStakingCaller) MinStake(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _ValidatorStaking.contract.Call(opts, &out, "MIN_STAKE")
	if err != nil {
		return nil, err
	}
	return out[0].(*big.Int), nil
}

// Stake is a paid mutator transaction binding the contract method 0x3a4b66f1.
func (_ValidatorStaking *ValidatorStakingTransactor) Stake(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ValidatorStaking.contract.Transact(opts, "stake")
}

// AddStake is a paid mutator transaction binding the contract method 0x5c19a95c.
func (_ValidatorStaking *ValidatorStakingTransactor) AddStake(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ValidatorStaking.contract.Transact(opts, "addStake")
}

// RequestWithdrawal is a paid mutator transaction binding the contract method 0x9fa6dd35.
func (_ValidatorStaking *ValidatorStakingTransactor) RequestWithdrawal(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ValidatorStaking.contract.Transact(opts, "requestWithdrawal")
}

// Withdraw is a paid mutator transaction binding the contract method 0x3ccfd60b.
func (_ValidatorStaking *ValidatorStakingTransactor) Withdraw(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ValidatorStaking.contract.Transact(opts, "withdraw")
}

// ClaimRewards is a paid mutator transaction binding the contract method 0x372500ab.
func (_ValidatorStaking *ValidatorStakingTransactor) ClaimRewards(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ValidatorStaking.contract.Transact(opts, "claimRewards")
}

// DistributeRewards is a paid mutator transaction binding the contract method 0xa217fddf.
func (_ValidatorStaking *ValidatorStakingTransactor) DistributeRewards(opts *bind.TransactOpts, attesters []common.Address) (*types.Transaction, error) {
	return _ValidatorStaking.contract.Transact(opts, "distributeRewards", attesters)
}

// Slash is a paid mutator transaction binding the contract method 0x02fb4d85.
func (_ValidatorStaking *ValidatorStakingTransactor) Slash(opts *bind.TransactOpts, validator common.Address, reason string) (*types.Transaction, error) {
	return _ValidatorStaking.contract.Transact(opts, "slash", validator, reason)
}
